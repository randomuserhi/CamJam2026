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
    crazy: HTMLDivElement;
}

const resp = await fetch("/ancientgeese/api/leaderboard");
const data = await resp.json();
const entries = Object.entries(data).sort((a, b) => (b[1] as any).stats.damageDealt - (a[1] as any).stats.damageDealt);
for (let i = 0; i < entries.length; ++i) {
    const resp = await fetch(`/ancientgeese/api/name?id=${entries[i][0]}`);
    const data = await resp.text();
    (entries[i][1] as any).stats.name = data;
}
console.log(entries);

const App = html.wc(() => {

    const proto: object = App.prototype;
    const comp = html(proto) <App>`
    <div m-id="body" class="${style.wrapper}">
        <div m-id="crazy" style="display: flex; flex-direction: column;">
        </div>
    </div>
    `;
    html(comp).box();

    let start = true;
    for (let i = 0; i < entries.length;) {

        const row = Row(start ? sprites.top : i % 2 == 0 ? sprites.middle2 : sprites.middle1);
        for (let j = 0; i < entries.length && j < 6; ++i, ++j) {
            const e = entries[i];
            row.names[j].innerText = (e[1] as any).stats.name;
            row.dmg[j].innerText = (e[1] as any).stats.damageDealt;
        }

        comp.crazy.append(...row);
        start = false;
    }

    comp.crazy.append(...Row(sprites.middle2));
    comp.crazy.append(...Row(sprites.middle1));

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