import { RapidRuntime } from "./RapidRuntime.cjs";

const PORT = 3000;

const app = new RapidRuntime(["..\\registry\\packages", "..\\registry\\apps"], "..\\registry\\_lib");

app.listen(PORT).then(() => {
    console.log(`Server running at http://localhost:${PORT}/`);
});