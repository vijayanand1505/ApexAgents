// Re-export the project's saved film bundle with frame-synchronized cast arrivals.
// The archived studio bundle is a local production prerequisite; see docs/video/storyboard.md.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "playwright";

const root = process.cwd();
const studio = resolve(process.env.FILM_STUDIO_DIST ?? "dashboard/dist");
const ffmpeg = process.env.FFMPEG_PATH;
if (!ffmpeg) throw new Error("Set FFMPEG_PATH to an FFmpeg executable with H.264 support.");
const output = resolve(process.env.FILM_OUTPUT ?? "spikes/out/film-render/apexagents-intro.mp4");
await mkdir(join(output, ".."), { recursive: true });
const html = await readFile(join(studio, "index.html"), "utf8");
const scriptName = html.match(/src="\/assets\/([^"/]+\.js)"/)?.[1];
if (!scriptName) throw new Error("The saved studio index has no matching JavaScript asset.");
let script = await readFile(join(studio, "assets", scriptName), "utf8");
// This saved bundle has no source in this checkout: fail explicitly if its timeline changes.
for (const [before, after] of [
  ["r<=8.2&&(r-6.1)%.48<.13", "r<=8.2&&(r-6.1)%.48<.16"],
  ["launching:r>=9.5", "launching:r>=10"],
] as const) {
  if (!script.includes(before)) throw new Error(`Saved film timeline differs: ${before}`);
  script = script.replace(before, after);
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  try {
    if (path === "/film") {
      res.writeHead(200, { "content-type": "text/html" }).end(html);
    } else if (path.startsWith("/assets/") && path === `/assets/${basename(path)}`) {
      const name = basename(path);
      const body = name === scriptName ? script : await readFile(join(studio, "assets", name));
      res.writeHead(200, { "content-type": name.endsWith(".js") ? "text/javascript" : "text/css" }).end(body);
    } else res.writeHead(404).end();
  } catch { res.writeHead(500).end("Could not load saved film assets."); }
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Could not start the film renderer.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
let encoder: ReturnType<typeof spawn> | undefined;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(`http://127.0.0.1:${address.port}/film?capture`);
  await page.waitForFunction(() => Boolean((window as any).squadFilm));
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: `
    .film-picker { width: 960px; left: 320px; top: 540px; }
    .film-picker .squad-stack-stage { transform: none; }
    .film-picker .squad-stack { --stack-size: 88px; --stack-step: 126px; width: 592px; height: 128px; transition: none; }
    .film-picker .squad-stack::before { content: ""; position: absolute; inset: 0;
      background: radial-gradient(circle at 44px 44px, transparent 34px, #302a3b 35px, transparent 37px) 0 0 / 126px 100% repeat-x; }
    .film-picker .squad-stepper { gap: 42px; justify-content: center; }
    .film-picker .squad-step { width: 56px; height: 56px; flex: 0 0 56px; }
    .film-picker .seat-art { height: 88px; }
    .film-picker .seat-art .character { width: 88px !important; height: 88px !important; }
    .film-picker .agent-seat::after { position: absolute; top: 102px; left: -8px; right: -8px;
      text-align: center; font: 500 17px system-ui; color: #c8c8ce; letter-spacing: .2px; }
    .film-picker [data-agent="bot1"]::after { content: "Plum"; }
    .film-picker [data-agent="bot2"]::after { content: "Lime"; }
    .film-picker [data-agent="bot3"]::after { content: "Tango"; }
    .film-picker [data-agent="bot4"]::after { content: "Blu"; }
    .film-picker [data-agent="bot5"]::after { content: "Sky"; }
    .film-picker .squad-energy { top: -145px; height: 240px; }
    .film-picker .squad-stack { --flame-height: 2.5; }
    .film-selected-count { margin-top: 22px; }
    .film-input { border-color: #40384b; box-shadow: 0 0 60px #924ff70b; }
  ` });
  await page.clock.runFor(100);
  encoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-i", "pipe:0",
    "-i", join(root, "web/public/media/apexagents-intro.mp4"), "-map", "0:v", "-map", "1:a", "-c:v", "libx264",
    "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", "-t", "52", output],
    { stdio: ["pipe", "ignore", "pipe"] });
  let encodeErrors = "";
  encoder.stderr?.on("data", chunk => { encodeErrors = (encodeErrors + chunk).slice(-3000); });
  const finished = once(encoder, "close");
  const checks: unknown[] = [];
  for (let frame = 0; frame < 1560; frame++) {
    const time = frame / 30;
    await page.evaluate(t => (window as any).squadFilm.seek(t), time);
    // Advancing the browser clock also advances React/Motion and each character's arrival.
    await page.clock.runFor(frame % 3 === 0 ? 34 : 33);
    const state = await page.evaluate(t => {
      const w = window as any;
      w.filmAnimationStarts ??= new WeakMap();
      for (const animation of document.getAnimations()) {
        if (!w.filmAnimationStarts.has(animation)) w.filmAnimationStarts.set(animation, performance.now());
        animation.pause();
        animation.currentTime = performance.now() - w.filmAnimationStarts.get(animation);
      }
      const count = Math.max(0, Math.min(5, Math.floor((t - 6.1) / .48) + 1));
      const seats = [...document.querySelectorAll<HTMLElement>(".film-picker .agent-seat")];
      seats.forEach((seat, index) => {
        const p = Math.max(0, Math.min(1, (t - (6.1 + index * .48)) / .18));
        const ease = 1 - (1 - p) ** 3;
        seat.style.opacity = "1";
        seat.style.transform = `translateY(${(1 - ease) * 20}px) scale(${.88 + ease * .12})`;
      });
      const add = document.querySelector<HTMLElement>(".film-picker .squad-add");
      if (add) {
        const elapsed = t - (6.1 + Math.max(0, count - 1) * .48);
        add.style.transform = count && elapsed < .16 ? "scale(.88)" : "none";
      }
      const pointer = document.querySelector<SVGElement>(".film-demo-pointer");
      const send = document.querySelector<HTMLElement>(".film-go");
      const stage = document.querySelector<HTMLElement>(".film-stage");
      if (pointer && add && send && stage) {
        const a = add.getBoundingClientRect(), b = send.getBoundingClientRect(), s = stage.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (t - 8.8) / .6));
        const mix = (a: number, b: number) => a + (b - a) * p;
        pointer.style.left = `${(mix(a.x + a.width / 2, b.x + b.width / 2) - s.x) / (s.width / 1600)}px`;
        pointer.style.top = `${(mix(a.y + a.height / 2, b.y + b.height / 2) - s.y) / (s.height / 900)}px`;
      }
      return { time: t, count, seats: seats.length, stage: document.querySelector<HTMLElement>(".film-stage")?.dataset.time };
    }, time);
    const jpeg = await page.screenshot({ type: "jpeg", quality: 94 });
    if (!encoder.stdin!.write(jpeg)) await once(encoder.stdin!, "drain");
    if ([195, 213, 231, 249, 267, 285].includes(frame)) {
      checks.push(state);
      if ((state as any).seats !== (state as any).count) throw new Error(`Cast/count mismatch at frame ${frame}`);
      await writeFile(join(output, "..", `cast-${frame}.jpg`), jpeg);
    }
    if (frame % 150 === 0) console.log(`Film: ${frame}/1560 frames`);
  }
  encoder.stdin!.end();
  const [code] = await finished;
  if (code !== 0) throw new Error(`FFmpeg failed: ${encodeErrors}`);
  if (errors.length) throw new Error(`Film page errors: ${errors.join(", ")}`);
  await writeFile(join(output, "..", "recording.json"), JSON.stringify({ recordedAt: new Date().toISOString(), frames: 1560,
    fps: 30, duration: 52, output, checks, pageErrors: errors, studio, timing: "One timeline; 480 ms clicks/arrivals, 180 ms reveal; original synchronized audio" }, null, 2));
  console.log(`Film complete: ${output}`);
} finally {
  encoder?.kill();
  await browser.close();
  server.closeAllConnections();
  server.close();
}
