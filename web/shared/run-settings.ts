export type RunPreset = "quick" | "balanced" | "thorough";
export type SquadMode = "auto" | "manual";

export const RUN_PRESETS = {
  quick: { label: "Quick", description: "A focused answer with less deliberation", maxBots: 2, masterEffort: "low", botEffort: "low", maxActions: 20, timeoutMin: 8 },
  balanced: { label: "Balanced", description: "Everyday research and comparisons", maxBots: 4, masterEffort: "medium", botEffort: "medium", maxActions: 30, timeoutMin: 20 },
  thorough: { label: "Thorough", description: "More cross-checking and room to explore", maxBots: 5, masterEffort: "high", botEffort: "high", maxActions: 60, timeoutMin: 30 },
} as const;

export function settingsForPreset(preset: RunPreset) {
  const { masterEffort, botEffort, maxActions, timeoutMin } = RUN_PRESETS[preset];
  return { masterEffort, botEffort, maxActions, timeoutMin };
}

/** A local, explainable suggestion: no model request before the actual task starts. */
export function suggestSquad(task: string, preset?: RunPreset): { bots: number; reason: string } {
  const text = task.trim().toLowerCase();
  const cap = preset ? RUN_PRESETS[preset].maxBots : 5;
  let bots = 2, reason = "A focused team for the task; adjust it if needed.";
  const explicit = text.match(/\b(?:use|with|assign|launch)\s+(one|two|three|four|five|[1-5])\s+(?:agents?|bots?)\b/);
  if (explicit) {
    const words = ["one", "two", "three", "four", "five"];
    return { bots: Number(explicit[1]) || words.indexOf(explicit[1]) + 1, reason: "Matches the team size requested in your task." };
  }
  const urls = [...new Set(text.match(/https?:\/\/[^\s,]+/g) ?? [])];
  if (/\b(audit|end.to.end|qa|test.*(?:website|shop|checkout)|find.*bugs|buggymart)\b/.test(text)) {
    bots = 5; reason = "Separate coverage for pages, search, cart, pricing and checkout.";
  } else if (urls.length > 1) {
    bots = Math.min(5, urls.length); reason = "The task names multiple pages that can be checked independently.";
  } else if (/\b(compare|comparison|versus|vs\.?|research|itinerary|plan.*(?:trip|weekend|travel))\b/.test(text)) {
    bots = preset === "thorough" ? 4 : 3; reason = "Independent research plus a cross-check.";
  } else if (/\b(find|buy|price|phones?|laptops?|headphones?|best|verify|fact.check)\b/.test(text)) {
    bots = 2; reason = "One agent researches while another checks the findings.";
  } else if (/^(?:what is|what's|who is|when is|open |check |summari[sz]e |read |explain |translate )/.test(text)) {
    bots = 1; reason = "A focused task that can start with one agent.";
  } else if (!text) {
    reason = "Describe a task to get a team-size suggestion.";
  }
  if (bots > cap) reason += ` ${RUN_PRESETS[preset!].label} limits the suggested team to ${cap}.`;
  return { bots: Math.min(bots, cap), reason };
}
