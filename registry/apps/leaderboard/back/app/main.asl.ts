import { app } from "rapid";
import { front } from "rapid/async-path";

app.route("GET", "/", async (match, req, res) => {
    await app.serve(await front("app", "index.html"), res);
});