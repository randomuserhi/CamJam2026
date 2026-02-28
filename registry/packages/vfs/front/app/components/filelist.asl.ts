import { html } from "rhu/html.asl";
import { computed, signal, Signal } from "rhu/signal.asl";
import Vfs from "vfs/lib/index.asl";
import { Style } from "rhu/style.asl";
import { EventManager } from "common/lib/event.asl";
import VfsPath from "vfs/lib/path.asl";
import storage from "hotreload/PersistentStorage.asl";

const style = Style(({ css }) => {
    const body = css.style`
    font-family: JetBrainsMono;
    
    display: flex;
    flex-direction: column;
    `;

    const nav = css.style`
    display: flex;
    padding: 5px;
    gap: 10px;
    `;

    const btn = css.style`
    color: white;
    `;
    
    const list = css.style`
    display: table;
    table-layout: fixed;
    `;
    
    const item = css.style`
    display: table-row;
    `;

    css`
    ${item}>div {
        display: table-cell;
        padding: 5px;
    }
    `;

    const cols = [
        css.style`
        width: 72.42%;
        `,
        css.style`
        width: 14.29%;
        `,
        css.style`
        width: 14.29%;
        `
    ];

    css`
    ${item}:hover {
        cursor: pointer;
        background-color: #607cbd;
    }
    `;

    const pathList = css.style`
    display: flex;
    `;

    css`
    ${pathList}>li {
        cursor: pointer;
    }

    ${pathList}>li::before {
        content: "/";
        padding: 0 5px;
    }
    `;

    return {
        nav,
        body,
        btn,
        list,
        item,
        cols,
        pathList
    };
});

interface FileListEvents {
    "click": Vfs.VfsNode;
}

interface FileList {
    path: Signal<string | undefined>;
    eventManager: EventManager<FileListEvents>;
}

interface Private {
    refresh(): Promise<void>;

    files: Signal<Vfs.VfsNode[]>;
    
    refreshBtn: HTMLButtonElement;
    activeRefresh: Promise<void>;
    cancelRefreshToken: { cancelled: boolean } | undefined;
}

function DateTimeToString(now: Date) {
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now).replace(/\//g, '-');

    return `${time} ${date}`;
}

const empty: Vfs.VfsNode[] = [];

export const FileList = html.wc<FileList>()(() => {
    const eventManager = new EventManager<FileListEvents>();

    const files = signal<Vfs.VfsNode[]>([]);
    const fileList = html.map(files, undefined, (kv, el?: html<{ 
        item: Signal<Vfs.VfsNode>,
        li: HTMLLIElement
    }>) => {
        const [,v] = kv;

        if (el === undefined) {
            const item = signal<Vfs.VfsNode>(v);
            el = html`
                <li m-id="li" class="${style.item}">
                    <div class="${style.cols[0]}">
                        ${computed<string>((value) => { value(item().name); }, [item])}
                    </div>
                    <div class="${style.cols[1]}">
                        ${computed<string>((value) => { const mtime = item()?.mtime; value(mtime ? `${DateTimeToString(new Date(mtime))}` : ""); }, [item])}    
                    </div>
                    <div class="${style.cols[2]}">
                        ${computed<string>((value) => { const size = item()?.size; value(size ? `${size}b` : ""); }, [item])}
                    </div>
                </li>`;
            el.item = item;
            el.li.addEventListener("click", () => {
                const _item = item();
                // TODO(randomuserhi): cleanup + switch case
                if (_item.type === "directory") {
                    eventManager.dispatch("click", _item);
                } else if (_item.type === "file") {
                    // TODO(randomuserhi): Download or viewer API
                    Vfs.downloadFile(VfsPath.join(comp.path()!, _item.name));
                }
            }, { signal: __ASL.signal });
        } else {
            el.item(v);
        }

        return el;
    });

    const path = signal<string | undefined>(storage.get("path"));
    const pathList = html.map(path, (p) => {
        if (p === undefined) return [];
        const parts: { last: string, full: string }[] = [];
        let full = "";
        for (const part of VfsPath.walk(p)) {
            full += `/${part}`;
            parts.push({
                last: part,
                full
            });
        }
        return parts.entries();
    }, (kv, el?: html<{ item: Signal<{ last: string, full: string }>, wrapper: HTMLLIElement }>) => {
        const [,v] = kv;

        if (el === undefined) {
            const item: Signal<{ last: string, full: string }> = signal(v);
            
            el = html`<li m-id="wrapper">${computed((value) => { value(item().last); }, [item])}</li>`;
            
            el.wrapper.addEventListener("click", () => {
                comp.path.trigger(item().full);
            }, { signal: __ASL.signal });
            
            el.item = item;
        } else {
            el.item(v);
        }

        return el;
    });

    const proto: object = FileList.prototype;
    const comp = html(proto)<FileList & Private>`
    <div class="${style.body}">
        <div class="${style.nav}">
            <button m-id="refreshBtn" class="${style.btn}">refresh</button>
            <div style="flex: 1">
                <ul class="${style.pathList}">${pathList}</ul>
            </div>
        </div>
        <ul class="${style.list}">${fileList}</ul>
    </div>
    `;
    html.box(comp);

    comp.refreshBtn.addEventListener("click", () => {
        comp.refresh();
    }, { signal: __ASL.signal });
    
    comp.path = path;
    comp.files = files;
    comp.eventManager = eventManager;
    comp.activeRefresh = Promise.resolve();

    eventManager.addEventListener("click", (e) => {
        const path = comp.path();
        if (path === undefined) return;

        comp.path(VfsPath.join(path, e.detail.name));
    });

    comp.path.on((value) => {
        storage.set("path", value);
        comp.refresh();
    });

    return comp;
});
FileList.prototype = {
    async refresh() {
        if (this.cancelRefreshToken !== undefined) {
            this.cancelRefreshToken.cancelled = true;
        }
        const cancelToken = { cancelled: false };
        this.cancelRefreshToken = cancelToken;
        
        const path = this.path();
        this.activeRefresh = this.activeRefresh.then(async () => {
            if (path === undefined) {
                this.files(empty);
                return;
            }

            let result = await Vfs.listDir(path, { pagination: { page: 0, limit: 50 } });
            this.files(result.entries);
            while (result.page < result.totalPages && !cancelToken.cancelled) {
                result = await Vfs.listDir(path, { pagination: { page: result.page + 1, limit: 50 } });
                this.files([...this.files(), ...result.entries]);
            }
        }).catch((err) => {
            // On Error, clear file list
            console.error(err);
            this.files(empty);
        });
        return this.activeRefresh;
    }
};