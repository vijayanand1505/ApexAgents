// Real React UI + HTTP/MCP + Chrome, with scripted agents and no paid API requests.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { SquadRunner } from "../lib/squad-runner.ts";
import { startUiServer } from "../lib/ui-server.ts";
import { startMcpHttp } from "../lib/mcp-browser-server.ts";
import { ROOT } from "../lib/run-kit.ts";
import { startMockAgentsApi, type Script } from "./mock-squad-api.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(test: () => boolean, label: string) {
  for (let i = 0; i < 200; i++) { if (test()) return; await sleep(50); }
  throw new Error(`Timed out: ${label}`);
}
let checks = 0;
function check(label: string, value: unknown) { assert.ok(value, label); console.log(`✓ ${label}`); checks++; }
const site = createServer((_req, res) => res.end('<!doctype html><title>Saved page</title><input id="note"><p>Verified finding</p>'));
await new Promise<void>((r) => site.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(site.address() as AddressInfo).port}`;
const forever = () => new Promise<void>(() => {});
let assigned = false;
const master: Script = async (s, input, { call }) => {
  if (input.includes("resuming an interrupted run")) {
    await call(s, "final_answer", { answer: "Resumed answer with both preserved findings", sources: [{ url }] });
    return;
  }
  if (input.startsWith("USER TASK") && !assigned) {
    assigned = true;
    await call(s, "start_bots", { bots: [
      { bot: "Plum", goal: "Read the first finding", sites: ["127.0.0.1"] },
      { bot: "Lime", goal: "Read the second finding", sites: ["127.0.0.1"] },
    ] });
    return;
  }
  if (input.includes("USER: Continue checking")) return forever();
  if (input.includes("Every bot is done")) await call(s, "final_answer", { answer: "Both findings verified", sources: [{ url }] });
};
const bot: Script = async (s, input, { call, text }) => {
  if (input.startsWith("WARM-UP")) return text(s, "ready");
  if (input.startsWith("ASSIGNMENT")) {
    await call(s, "open", { url, why: "Read local test page" });
    if (s.label === "bot2") return forever();
    await call(s, "finish", { summary: "First complete report with evidence", sources: [{ url, title: "Saved evidence" }] });
  } else {
    await call(s, "finish", { summary: "Second report after resume", sources: [{ url }] });
  }
};
const mock = await startMockAgentsApi({ master, bot });
const out = mkdtempSync(join(tmpdir(), "run-controls-"));
const shots = join(ROOT, "spikes/out/run-controls");
mkdirSync(shots, { recursive: true });
let mcpPort = 0;
const runner = new SquadRunner({ apiKey: "offline", apiBase: mock.base, publicUrl: async () => `http://127.0.0.1:${mcpPort}`, outRoot: out, profileRoot: join(out, "profiles") });
const mcp = await startMcpHttp({ port: 0, token: runner.token, routes: runner.routes, onRequest: (r) => runner.current?.onMcp(r) });
mcpPort = mcp.port;
const defaults = { bots: 5, masterModel: "gpt-6.1-sol", botModel: "gpt-6-luna", maxActions: 30, timeoutMin: 20, webSearch: true, allowDirect: false, allow: [], fresh: true };
const ui = await startUiServer({ port: 0, staticDir: join(ROOT, "web/dist"), runner, defaults, models: { master: [defaults.masterModel], bot: [defaults.botModel] }, tunnel: () => ({ state: "ready" }) });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true });
const errors: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(ui.url);
  await page.getByRole("button", { name: "Balanced", exact: true }).waitFor();
  check("new chats default to Balanced and automatic sizing", await page.getByRole("button", { name: "Balanced", exact: true }).getAttribute("aria-pressed") === "true" && (await page.locator("#agents-val").innerText()).startsWith("Auto"));
  await page.locator("#input").fill("Audit BuggyMart");
  check("automatic preview responds to the task", await page.locator("#agents-val").innerText() === "Auto · 4 agents");
  await page.getByRole("button", { name: "Quick", exact: true }).click();
  check("Quick caps the suggested team", await page.locator("#agents-val").innerText() === "Auto · 2 agents");
  await page.locator("#agents-chip").click();
  await page.getByRole("button", { name: "Add a bot", exact: true }).click();
  check("manual selection overrides automatic sizing", await page.locator("#agents-val").innerText() === "3 agents");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Thorough", exact: true }).click();
  check("changing preset retains manual team size", await page.locator("#agents-val").innerText() === "3 agents");
  await page.locator("#opts-btn").click();
  check("Thorough applies effort and limits", await page.locator("#o-maxActions").inputValue() === "60" && await page.locator("#o-timeoutMin").inputValue() === "30" && await page.locator("#o-masterEffort").inputValue() === "high");
  await page.locator("#o-maxActions").fill("45");
  check("editing an advanced limit marks the settings Custom", await page.locator(".run-presets").innerText().then((s) => s.includes("Custom")));
  await page.reload();
  await page.locator("#opts-btn").click();
  check("manual and custom settings survive reload", await page.locator("#agents-val").innerText() === "3 agents" && await page.locator("#o-maxActions").inputValue() === "45");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Balanced", exact: true }).click();
  await page.locator("#agents-chip").click();
  await page.getByRole("button", { name: "Auto", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator("#input").fill("Find the two local findings");
  await page.screenshot({ path: join(shots, "desktop-settings.png") });
  await page.locator("#send").click();
  await until(() => !!runner.current?.squad.bots[0]?.result && runner.current.squad.bots[1]?.status === "working", "one report complete and one unfinished");
  const run = runner.current!;
  const squad = run.squad;
  check("backend resolves the auto squad before opening browsers", run.options.bots === 2 && squad.bots.length === 2);
  check("healthy unfinished work is not resumable", !squad.health().canResume);
  const [plum, lime] = squad.bots;
  const originalPlum = plum.session;
  const limePage = lime.browser.page;
  await limePage.locator("#note").fill("Keep browser state");
  const used = lime.tools.state.actions;
  const completed = JSON.stringify(plum.result);
  // Age only the session event clock; page frames continue and must not mask a quiet agent.
  lime.session!.lastActivityAt = Date.now() - 95_000;
  // Let the tool-event clock age too, without waiting 90 seconds in the test.
  const now = Date.now;
  Date.now = () => now() + 95_000;
  check("quiet agents are detected while browser frames continue", squad.health().targets.includes(lime.id));
  Date.now = now;
  // Simulate the same stale tool timestamp through the public health clock argument.
  check("normal reasoning gets a 90-second grace period", !squad.health(now() + 30_000).canResume);
  squad.takeover(lime.id, true);
  check("human browser control blocks recovery", squad.health(now() + 95_000).state === "waiting" && !squad.health(now() + 95_000).canResume);
  squad.takeover(lime.id, false);
  // Stop is a real user action and offers an immediate, explicit Resume.
  await page.locator("#stop").click();
  await until(() => squad.health().state === "paused", "paused health");
  check("Stop keeps the chat paused until a user resumes", squad.health().state === "paused");
  await page.getByRole("button", { name: "Resume", exact: true }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(shots, "paused.png") });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const duplicate = await fetch(`${ui.url}/api/runs/${run.id}/resume`, { method: "POST", headers: { origin: ui.url, "content-type": "application/json" }, body: "{}" });
  check("duplicate Resume does not start a second recovery", duplicate.status === 409 || (duplicate.status === 202 && (await duplicate.json()).started === false));
  await until(() => !!lime.result && squad.answers.length > 0 && squad.health().state !== "recovering", "recovered answer");
  check("completed reports and their sessions remain intact", JSON.stringify(plum.result) === completed && plum.session === originalPlum && !mock.seen.deletes.includes("bot1"));
  check("unfinished agent keeps its actual browser and input state", lime.browser.page === limePage && await limePage.locator("#note").inputValue() === "Keep browser state");
  check("recovery retains action consumption", lime.tools.state.actions >= used);
  check("replacement Onyx receives full completed findings and sources", [...mock.sessions.values()].filter((s) => s.label === "master").at(-1)!.inputs[0].includes("First complete report with evidence") && [...mock.sessions.values()].filter((s) => s.label === "master").at(-1)!.inputs[0].includes("Saved evidence"));
  check("recovery closes only replaced sessions", mock.seen.deletes.includes("bot2") && mock.seen.deletes.includes("master"));
  await page.waitForSelector("#app.results");
  await page.screenshot({ path: join(shots, "resumed-results.png") });
  check("ready results are not offered Resume", !squad.health().canResume);
  const forbidden = await fetch(`${ui.url}/api/runs/${run.id}/resume`, { method: "POST", headers: { origin: "http://evil.example", "content-type": "application/json" }, body: "{}" });
  check("Resume retains the server's origin protection", forbidden.status === 403);
  await run.end("test_complete");
  check("ended runs cannot resume", !run.health().canResume);

  assigned = false;
  const second = runner.start("Find both local findings again", { ...defaults, bots: 2 });
  await until(() => second.status === "running" && !!second.squad.bots[0]?.result && second.squad.bots[1]?.status === "working" && !second.squad.master?.busy, "second run waiting on Lime");
  const healthyMaster = second.squad.master;
  const healthyPlum = second.squad.bots[0].session;
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 95_000;
    check("stalled recovery targets only the unfinished agent", JSON.stringify(second.squad.health().targets) === JSON.stringify(["bot2"]));
    second.squad.resume();
  } finally { Date.now = realNow; }
  await until(() => second.squad.answers.length > 0 && second.squad.health().state !== "recovering", "only stale bot recovers");
  check("a stalled bot resumes without replacing healthy Onyx or a finished teammate", second.squad.master === healthyMaster && second.squad.bots[0].session === healthyPlum);
  await second.end("test_complete");

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const mobile = await browser.newPage({ viewport, reducedMotion: "reduce" });
    await mobile.goto(ui.url);
    await mobile.getByRole("button", { name: "Balanced", exact: true }).waitFor();
    check(`task field and Send fit at ${viewport.width}px`, await mobile.locator("#input").evaluate((el) => el.getBoundingClientRect().width > 80) && await mobile.locator("#send").evaluate((el) => el.getBoundingClientRect().right <= innerWidth));
    await mobile.locator("#agents-chip").click();
    await mobile.screenshot({ path: join(shots, `settings-${viewport.width}.png`) });
    check(`squad controls fit at ${viewport.width}px`, await mobile.locator("#agents-pop").evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    check(`settings do not overflow at ${viewport.width}px`, await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.close();
  }
  check("no browser script errors", errors.length === 0);
  console.log(`All ${checks} run-control checks passed.`);
} finally {
  await browser.close();
  if (runner.current) await runner.current.end("test_cleanup");
  await ui.close();
  mcp.server.close();
  mock.close();
  site.close();
  rmSync(out, { recursive: true, force: true });
}
