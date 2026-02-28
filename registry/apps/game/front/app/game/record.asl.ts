import { Game } from "./game.asl";

export async function recordGame(game: Game) {
    const recordedChunks: Blob[] = [];

    const stream = game.renderer.canvas.captureStream();
    const [track] = stream.getVideoTracks();
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "recording.webm";

        document.body.appendChild(a);
        a.click(); 

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    mediaRecorder.start();

    const recordJob = async () => {

        // TODO(randomuserhi): replay games and record them
        //                     set canvas size n shit for render
        for (let i = 0; i < 100; i++) {
            game.tick(game.fixedDeltaTime);
            game.update(game.fixedDeltaTime);
            (track as CanvasCaptureMediaStreamTrack).requestFrame();
            await new Promise(requestAnimationFrame);
        }

    };
    await recordJob();

    mediaRecorder.stop();
}