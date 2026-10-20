// Offline regression for the built React dashboard's completion view; no model calls.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { WebSocketServer } from "ws";
import { ROOT } from "../lib/run-kit.ts";

const dist = join(ROOT, "web/dist");
assert.ok(existsSync(join(dist, "index.html")), "Build the frontend before running this check.");
const shots = join(ROOT, "spikes/out/results-ui");
mkdirSync(shots, { recursive: true });
const defaults = { bots: 3, masterModel: "gpt-6.1-sol", botModel: "gpt-6-luna", maxActions: 30, timeoutMin: 5, webSearch: true, allowDirect: false, allow: [], fresh: true };
const run = { id: "result-test", task: "Compare three phones", status: "running", startedAt: Date.now(), options: defaults };
const config = { defaults, models: { master: [defaults.masterModel], bot: [defaults.botModel] }, efforts: ["none", "low"], tunnel: { state: "ready", source: "offline test" } };
const events: Record<string, unknown>[] = [];
function event(type: string, data: Record<string, unknown>, botId?: string) {
  const seq = events.length + 1;
  const e = { id: `event-${seq}`, runId: run.id, seq, ts: Date.now(), source: botId ?? "master", type, data, ...(botId ? { botId } : {}) };
  events.push(e);
  return e;
}
event("run.created", { task: run.task, options: defaults });
event("run.status", { status: "running" });
const cast = [ ["bot1", "Plum", "#924FF7"], ["bot2", "Lime", "#04B84C"], ["bot3", "Tango", "#FF8549"] ];
for (const [i, [id, name, color]] of cast.entries()) event("bot.spawned", { name, color, index: i + 1 }, id);
const assignments = cast.map(([botId, name]) => ({ botId, label: `${name}'s comparison`, goal: "Compare price and battery", startUrl: "https://example.com" }));
event("plan.ready", { assignments });
for (const a of assignments) {
  event("bot.assigned", { ...a, assignment: 1 }, a.botId);
  event("bot.status", { status: "finished" }, a.botId);
  event("bot.result", { summary: "Compared the phone specifications", sources: [] }, a.botId);
}
event("master.status", { busy: false });

const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path.startsWith("/api/")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(path === "/api/runs" ? { runs: [] } : config));
  }
  const file = resolve(dist, path === "/" ? "index.html" : `.${path}`);
  if (!file.startsWith(`${dist}/`) || !existsSync(file) || !types[extname(file)]) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] });
  res.end(readFileSync(file));
});
const sockets = new WebSocketServer({ server, path: "/ws" });
sockets.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "hello", config }));
  socket.send(JSON.stringify({ type: "snapshot", run, events }));
});
function send(type: string, data: Record<string, unknown>) {
  const message = JSON.stringify({ type: "event", event: event(type, data) });
  for (const socket of sockets.clients) socket.send(message);
}
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true });
let checks = 0;
const check = (name: string, pass: boolean) => { assert.ok(pass, name); checks++; console.log(`✓ ${name}`); };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector(".onyx-card-top");
  check("reports remain expanded until the final answer arrives", await page.locator(".onyx-card-top").getAttribute("aria-expanded") === "true");
  const answer = "### Phone comparison\n\n| Phone | Price | Battery |\n|---|---|---|\n| Example A | ₹14,999 | 5,000 mAh |\n| Example B | ₹13,999 | 6,000 mAh |\n\n" + Array.from({ length: 20 }, (_, i) => `### Finding ${i + 1}\n\nThe comparison includes price, battery life, software support, and purchase sources. Read the details before choosing.\n\n`).join("") + "End of the full comparison.";
  send("run.result", { answer, sources: [{ title: "Comparison source", url: "https://example.com/phones" }], n: 1 });
  await page.waitForSelector("#app.results");
  await page.waitForTimeout(700);
  check("both report panels collapse on completion", await page.locator(".onyx-card-top").getAttribute("aria-expanded") === "false" && await page.locator(".mission .m-head").getAttribute("aria-expanded") === "false");
  check("results take the main reading space", !(await page.locator("#wall").isVisible()) && (await page.locator(".answer").boundingBox())!.width > 800);
  const atHeading = () => page.evaluate(() => Math.abs(document.querySelector(".answer")!.getBoundingClientRect().top - document.querySelector("#thread")!.getBoundingClientRect().top - 12) < 5);
  check("long results open at the heading", await atHeading());
  check("only the three participating agents celebrate", await page.locator(".result-cast > span").count() === 3);
  await page.screenshot({ path: join(shots, "desktop.png") });
  await page.locator(".onyx-card-top").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("reports can be reopened with the keyboard", await page.locator(".master-roster").isVisible() && await page.locator(".onyx-card-top").getAttribute("aria-expanded") === "true");
  await page.locator(".onyx-card-top").click();
  await page.getByRole("button", { name: "View browsers", exact: true }).click();
  await page.waitForSelector("#app.side:not(.results)");
  check("the browser wall remains available", await page.locator("#wall").isVisible());
  await page.getByRole("button", { name: "Read results", exact: true }).click();
  await page.waitForSelector("#app.results");
  check("returning to results restores the heading", await atHeading());
  await page.locator("#thread").evaluate((el) => { el.scrollTop += 400; });
  const scroll = await page.locator("#thread").evaluate((el) => el.scrollTop);
  send("usage.updated", { costUSD: 0.1 });
  await page.waitForTimeout(150);
  check("background updates do not interrupt reading", Math.abs(await page.locator("#thread").evaluate((el) => el.scrollTop) - scroll) < 3);
  await page.locator("#thread").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  check("the full result and its source remain reachable", await page.getByRole("link", { name: "Comparison source", exact: true }).isVisible());
  send("run.result", { answer: "### Updated recommendation\n\nThe updated comparison.", n: 2, sources: [] });
  await page.getByRole("heading", { name: "Updated results · 2" }).waitFor();
  await page.waitForTimeout(500);
  check("a revised answer becomes the visible result", await page.locator(".answer").last().evaluate((el) => el.getBoundingClientRect().top > 0 && el.getBoundingClientRect().top < innerHeight));
  await page.reload();
  await page.waitForSelector("#app.results");
  check("replayed results open collapsed without replaying the entrance", await page.locator(".result-arrival").count() === 0 && await page.locator(".onyx-card-top").getAttribute("aria-expanded") === "false");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobile.goto(url);
  await mobile.waitForSelector("#app.results");
  await mobile.screenshot({ path: join(shots, "mobile.png") });
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth)) console.log(await mobile.evaluate(() => [...document.querySelectorAll("#app *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map((el) => ({ tag: el.tagName, id: el.id, class: el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right }))));
  check("mobile results fit without page overflow", await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check("mobile leaves room to read the result", (await mobile.locator("#thread").boundingBox())!.height > 250);
  send("run.result", { answer: "### Reduced-motion result\n\nReady to read.", n: 3, sources: [] });
  await mobile.getByRole("heading", { name: "Updated results · 3" }).waitFor();
  check("reduced motion disables the entrance", await mobile.locator(".answer").last().evaluate((el) => getComputedStyle(el).animationName === "none"));
  check("even a short updated answer starts at the top of the reading area", await mobile.locator(".answer").last().evaluate((el) => { const top = el.getBoundingClientRect().top - document.querySelector("#thread")!.getBoundingClientRect().top; return top >= 0 && top < 40; }));
  await mobile.screenshot({ path: join(shots, "mobile.png") });
  await mobile.close();
  send("plan.ready", { assignments });
  await page.waitForSelector("#app.side:not(.results)");
  check("a new plan restores the browsers and expanded reports", await page.locator("#wall").isVisible() && await page.locator(".onyx-card-top").getAttribute("aria-expanded") === "true");
  check("no browser script errors", errors.length === 0);
  console.log(`All ${checks} results-view checks passed (screenshots: spikes/out/results-ui/).`);
} finally {
  await browser.close();
  for (const socket of sockets.clients) socket.terminate();
  sockets.close();
  server.close();
}
