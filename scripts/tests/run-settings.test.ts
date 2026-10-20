import test from "node:test";
import assert from "node:assert/strict";
import { suggestSquad, RUN_PRESETS } from "../../web/shared/run-settings.ts";
import { parseRunOptions } from "../lib/squad-runner.ts";

const defaults = { bots: 5, masterModel: "gpt-6.1-sol", botModel: "gpt-6-luna", maxActions: 30, timeoutMin: 20, webSearch: true, allowDirect: false, allow: [], fresh: false };
test("suggested teams fit the task and preset without a model call", () => {
  assert.equal(suggestSquad("Summarize https://example.com/article").bots, 1);
  assert.equal(suggestSquad("Find mobile phones under 15k").bots, 2);
  assert.equal(suggestSquad("Compare phone specifications").bots, 3);
  assert.equal(suggestSquad("Audit BuggyMart", "thorough").bots, 5);
  assert.equal(suggestSquad("Audit BuggyMart", "quick").bots, 2);
  assert.equal(suggestSquad("Check https://a.test and https://b.test and https://c.test").bots, 3);
  assert.equal(suggestSquad("Use five agents to check this", "quick").bots, 5);
  assert.ok(suggestSquad("Find a deal").reason.length > 0);
});
test("server resolves auto teams while retaining manual and legacy callers", () => {
  assert.equal(parseRunOptions({ squadMode: "auto" }, defaults, "Summarize this page").bots, 1);
  assert.equal(parseRunOptions({ squadMode: "manual", bots: 4 }, defaults, "Summarize this page").bots, 4);
  assert.equal(parseRunOptions({ bots: 3 }, defaults, "Summarize this page").bots, 3);
  assert.throws(() => parseRunOptions({ squadMode: "typo" }, defaults), /Squad mode/);
});
test("presets fill limits and reasoning; explicit advanced values remain possible", () => {
  for (const preset of ["quick", "balanced", "thorough"] as const) {
    const result = parseRunOptions({ runPreset: preset, squadMode: "auto" }, defaults, "Audit BuggyMart");
    assert.equal(result.bots, RUN_PRESETS[preset].maxBots);
    assert.equal(result.botEffort, RUN_PRESETS[preset].botEffort);
    assert.equal(result.masterEffort, RUN_PRESETS[preset].masterEffort);
    assert.equal(result.timeoutMin, RUN_PRESETS[preset].timeoutMin);
  }
  assert.equal(parseRunOptions({ runPreset: "quick", maxActions: 35 }, defaults).maxActions, 35);
  assert.throws(() => parseRunOptions({ runPreset: "turbo" }, defaults), /Run preset/);
});
