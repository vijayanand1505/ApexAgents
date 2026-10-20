export type RunHealth = {
  state: "starting" | "working" | "waiting" | "paused" | "stalled" | "recovering" | "ready" | "ended";
  reason: string;
  lastActivityAt: number;
  canResume: boolean;
  targets: string[];
  error?: string;
};
