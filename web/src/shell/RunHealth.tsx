import { useEffect, useState } from "react";
import type { RunHealth as Health } from "../../shared/run-health";
import { backendFetch } from "../backend";
import { S, notify } from "../live/store";
import { post } from "../live/actions";
import "./run-health.css";

export function RunHealth({ runId }: { runId: string }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    const poll = async () => {
      if (document.hidden || fetching) return;
      fetching = true;
      try {
        const response = await backendFetch(`/api/runs/${runId}/health`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not check progress.");
        if (!controller.signal.aborted) {
          setHealth(data); setError("");
          if (S.run?.id === runId) { S.run.health = data; notify(); }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
      } finally { fetching = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    const visible = () => void poll();
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [runId, refresh]);

  const resume = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await post(`/api/runs/${runId}/resume`);
      setHealth((h) => h && { ...h, state: "recovering", reason: "Resuming unfinished work…", canResume: false });
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setPending(false); setRefresh((n) => n + 1); }
  };
  const age = health ? Math.max(0, Math.floor((Date.now() - health.lastActivityAt) / 1000)) : 0;
  return <div id="activity" className={`activity run-health ${health?.state ?? "loading"}`}>
    <div className="health-copy" role="status">
      <span className="health-reason">{error || health?.reason || "Checking run progress…"}</span>
      {health && <small>Last activity {age < 5 ? "just now" : `${age}s ago`}{health.error ? ` · ${health.error}` : ""}</small>}
    </div>
    {health?.canResume && !error && <button type="button" className="btn small" disabled={pending} onClick={() => void resume()}>{pending ? "Resuming…" : "Resume"}</button>}
    {error && <button type="button" className="btn small" onClick={() => setRefresh((n) => n + 1)}>Check again</button>}
  </div>;
}
