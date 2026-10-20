import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Squad } from "../lib/squad.ts";
import { AgentSession } from "../lib/agent-session.ts";
import { createAgentsApi } from "../lib/agents-api.ts";
import { createRunLog } from "../lib/run-kit.ts";

function fixture() {
  const out = mkdtempSync(join(tmpdir(), "health-test-"));
  const api = createAgentsApi({ base: "http://unused.invalid", key: "offline" });
  const run = createRunLog({ prefix: "health-test", out, print: () => {} });
  const squad = new Squad({ api, run, token: "test", runId: "test", bots: 1, allow: [], masterModel: "test", botModel: "test", maxActions: 20, webSearch: false, headless: true, cursor: false, signal: new AbortController().signal });
  const session = new AgentSession({ api, body: {}, signal: new AbortController().signal, sse: squad.sse, log: () => {}, record: () => {}, onTurnEnd: () => {}, onFailure: () => {} });
  session.id = "old-session";
  squad.master = session;
  return { squad, session, api, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

test("quiet reasoning waits 90 seconds; unanswered idle runs and ended runs differ", () => {
  const f = fixture();
  try {
    const now = Date.now();
    f.session.busy = true;
    assert.equal(f.squad.health(now + 89_000).canResume, false);
    assert.deepEqual(f.squad.health(now + 91_000).targets, ["master"]);
    f.session.busy = false;
    assert.deepEqual(f.squad.health(now + 16_000).targets, ["master"]);
    f.squad.closing = true;
    assert.equal(f.squad.health().canResume, false);
  } finally { f.cleanup(); }
});

test("Resume reports session-close failure and never creates a replacement over it", async () => {
  const f = fixture();
  let creates = 0;
  try {
    f.session.closed = true;
    f.session.close = async () => ({ items: [], deleted: false });
    f.api.deleteSession = async () => { throw new Error("offline deletion failure"); };
    f.api.createStreaming = async () => { creates++; throw new Error("must not create"); };
    assert.equal(f.squad.resume(), true);
    assert.equal(f.squad.resume(), false);
    for (let i = 0; i < 20 && f.squad.health().state === "recovering"; i++) await new Promise((r) => setTimeout(r, 5));
    assert.equal(creates, 0);
    assert.equal(f.squad.master, f.session);
    assert.match(f.squad.health().error ?? "", /could not be closed/);
    assert.equal(f.squad.health().canResume, true);
  } finally { f.cleanup(); }
});

test("Stop during recovery prevents a replacement session from starting", async () => {
  const f = fixture();
  let release!: () => void;
  let creates = 0;
  try {
    f.session.closed = true;
    f.session.close = async () => { await new Promise<void>((r) => { release = r; }); return { items: [], deleted: true }; };
    f.api.createStreaming = async () => { creates++; throw new Error("must not create"); };
    f.squad.resume();
    assert.equal(f.squad.halt(), true);
    release();
    for (let i = 0; i < 20 && f.squad.health().state === "recovering"; i++) await new Promise((r) => setTimeout(r, 5));
    assert.equal(creates, 0);
    assert.equal(f.squad.health().state, "paused");
  } finally { f.cleanup(); }
});
