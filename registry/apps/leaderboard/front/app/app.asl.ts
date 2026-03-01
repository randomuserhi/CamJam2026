import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { Row } from "./row.asl";
import { sprites } from "./sprites.asl";

const style = Style(({ css }) => {
    const wrapper = css.style`
    width: 100%;
    z-index: -10;
    position: relative;
    background-color: #222134;
    `;

    const row = css.style`
    
    `;

    return {
        wrapper,
        row
    };
});

interface App {
    body: HTMLDivElement;
    top: HTMLDivElement;
}

const row = () => {
    return html`<canvas></canvas>`;
}

const resp = await fetch("/ancientgeese/api/leaderboard");
const data = resp.json();
console.log(data);

const App = html.wc(() => {

    const proto: object = App.prototype;
    const comp = html(proto) <App>`
    <div m-id="body" class="${style.wrapper}">
        <div style="display: flex; flex-direction: column;">
            ${Row(sprites.top)}
            ${Row(sprites.middle1)}
            ${Row(sprites.middle2)}
        </div>
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