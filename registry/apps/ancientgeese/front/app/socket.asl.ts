let _ws: WebSocket | undefined = undefined;

/** Creates a websocket connection to Vfs package if one does not exist already. */
export function ws() {
    return new Promise<WebSocket>((resolve, reject) => {
        let ws = _ws;
        if (ws === undefined || ws.readyState === ws.CLOSED) {
            ws = new WebSocket(`ws://${window.location.host}/vfs`);
            _ws = ws;
        }

        if (ws.readyState === ws.OPEN) {
            // Socket was already ready
            resolve(ws);
            return;
        }

        // Wait for socket to connect (reject on close)

        const dispose = () => {
            ws.removeEventListener("open", open);
            ws.removeEventListener("close", close);
        };

        const close = () => {
            reject(new Error("Web socket closed prior task completion."));
            dispose();
        };

        const open = () => {
            resolve(ws);
            dispose();
        };

        ws.addEventListener("open", open);
        ws.addEventListener("close", close);
    });
}