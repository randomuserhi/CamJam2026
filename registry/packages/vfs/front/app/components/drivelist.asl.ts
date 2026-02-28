import { html } from "rhu/html.asl";
import { computed, signal, Signal } from "rhu/signal.asl";
import Vfs from "vfs/lib/index.asl";
import { Style } from "rhu/style.asl";
import { EventManager } from "common/lib/event.asl";

const style = Style(({ css }) => {
    const body = css.style`
    font-family: JetBrainsMono;
    
    display: flex;
    flex-direction: column;
    `;

    const nav = css.style`
    padding: 5px;
    `;

    const btn = css.style`
    color: white;
    `;
    
    const list = css.style`
    `;
    
    const item = css.style`
    padding: 5px;
    `;

    css`
    ${item}:hover {
        cursor: pointer;
        background-color: #607cbd;
    }
    `;

    return {
        nav,
        body,
        btn,
        list,
        item
    };
});

interface DriveListEvents {
    "click": Vfs.VfsNode;
}

interface DriveList {
    refresh(): Promise<void>;

    eventManager: EventManager<DriveListEvents>;
}

interface Private {
    drives: Signal<Vfs.VfsNode[]>;
    
    refreshBtn: HTMLButtonElement;
}

export const DriveList = html.wc<DriveList>()(() => {
    const eventManager = new EventManager<DriveListEvents>();

    const drives = signal<Vfs.VfsNode[]>([]);
    const driveList = html.map(drives, undefined, (kv, el?: html<{ 
        item: Signal<Vfs.VfsNode>,
        li: HTMLLIElement
    }>) => {
        const [,v] = kv;

        if (el === undefined) {
            const item = signal<Vfs.VfsNode>(v);
            el = html`<li m-id="li" class="${style.item}">${computed<string>((value) => { value(item().name); }, [item])}</li>`;
            el.item = item;
            el.li.addEventListener("click", () => {
                eventManager.dispatch("click", item());
            }, { signal: __ASL.signal });
        } else {
            el.item(v);
        }

        return el;
    });

    const proto: object = DriveList.prototype;
    const comp = html(proto)<DriveList & Private>`
    <div class="${style.body}">
        <div class="${style.nav}">
            <button m-id="refreshBtn" class="${style.btn}">refresh</button>
        </div>
        <ul class="${style.list}">${driveList}</ul>
    </div>
    `;
    html.box(comp);

    comp.refreshBtn.addEventListener("click", () => {
        comp.refresh();
    }, { signal: __ASL.signal });

    comp.drives = drives;
    comp.eventManager = eventManager;

    return comp;
});
DriveList.prototype = {
    async refresh() {
        this.drives(await Vfs.listDir("/"));
    }
};