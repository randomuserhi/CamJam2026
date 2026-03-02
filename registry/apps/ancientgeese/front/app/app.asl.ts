import { html } from "rhu/html.asl";
import { Style } from "rhu/style.asl";
import { GameComp } from "./game/comp.asl";

// Load math extensions statically
await __ASL.require("./game/math/ext.asl");

let bgm: HTMLAudioElement | undefined = undefined;
window.addEventListener("click", () => {
    if ((window as any).game.inReplayMode) return;
    bgm = new Audio("/ancientgeese/assets/audio/soundtrack2.mp3");
    bgm.loop = true;
    bgm.play();
}, { once: true });

__ASL.onAbort(() => {
    if (bgm) bgm.pause();
});

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
    game: html<typeof GameComp>;
}

const App = html.wc(() => {
    const proto: object = App.prototype;
    const comp = html(proto) <App>`
    <div m-id="body" class="${style.wrapper}">
        ${html.bind(GameComp(), "game")}
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