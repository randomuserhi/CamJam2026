import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { GameComp } from "./game/comp.asl";

// Load math extensions statically
await __ASL.require("./game/math/ext.asl");

const style = Style(({ css }) => {
    const wrapper = css.style`
    width: 100%;
    height: 100%;
    `;

    return {
        wrapper,
    };
});

interface App {
    body: HTMLDivElement;
}

const App = html.wc(() => {
    const proto: object = App.prototype;
    const comp = html(proto)<App>`
    <div m-id="body" class="${style.wrapper}">
        ${GameComp()}
    </div>
    `;
    html(comp).box();
    return comp;
});
App.prototype = {
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