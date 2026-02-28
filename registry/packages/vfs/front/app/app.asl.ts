import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { DriveList } from "./components/drivelist.asl";
import { FileList } from "./components/filelist.asl";

const style = Style(({ css }) => {
    // Potential pallete
    // #1f1f1f
    // #607cbd
    // #1d182c
    // #429c84
    // #2a3c7d
    // #5ea5d8
    // #3d6b8c
    // #e5e5e5

    css`
    html, body {
        height: 100%;
    }

    body {
        background-color: #1f1f1f;
        color: white;
    }
    `;

    const body = css.style`
    display: flex;
    height: 100%;
    `;

    const left = css.style`
    max-width: 200px;
    min-width: 100px;
    flex: 1;
    `;

    const right = css.style`
    flex: 5;
    `;

    return {
        body,
        left,
        right
    };
});

interface App {
    driveList: html<typeof DriveList>;
    fileList: html<typeof FileList>;
}

const App = () => {
    const comp = html<App>`
    <div class="${style.body}">
        <div class="${style.left}">
            ${html.bind(DriveList(), "driveList")}
        </div>
        <div class="${style.right}">
            ${html.bind(FileList(), "fileList")}
        </div>
    </div>
    `;
    html(comp).box();

    comp.driveList.refresh();
    comp.driveList.eventManager.addEventListener("click", (e) => {
        comp.fileList.path(`/${e.detail.name}`);
    });

    return comp;
};

export const app = App();

// Load app
const __load__ = async () => {
    document.body.replaceChildren(...app);
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __load__);
} else {
    __load__();
}