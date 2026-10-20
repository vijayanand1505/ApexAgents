import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createBuggyMart } from "../targets/buggymart/server.ts";

// `npm run web` serves this app on :5173 and forwards /api and /ws to the dashboard server
// (`npm run ui`, :8787). That server only takes requests from its own page (it checks Origin), so the
// proxy vouches for this dev page alone: it rewrites Origin only when it is the dev server's own.
const API = process.env.APEXAGENTS_API ?? "http://127.0.0.1:8787";
const PORT = Number(process.env.VITE_PORT ?? 5173);
const OWN = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);
const vouch = (proxyReq: { setHeader(name: string, value: string): void }, req: IncomingMessage) => {
  if (OWN.has(req.headers.origin ?? "")) proxyReq.setHeader("origin", API);
};

export default defineConfig({
  plugins: [react(), {
    name: "buggymart-local",
    configureServer(server) {
      const buggy = createBuggyMart("all", "/buggymart");
      const fixed = createBuggyMart("none", "/buggymart/fixed");
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;
        if (path === "/buggymart/fixed" || path.startsWith("/buggymart/fixed/")) {
          fixed.emit("request", req, res);
        } else if (path === "/buggymart" || path.startsWith("/buggymart/")) {
          buggy.emit("request", req, res);
        } else next();
      });
    },
  }],
  define: { __APEXAGENTS_API__: JSON.stringify(API) },
  resolve: { alias: { "@swarm/shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
  server: {
    port: PORT,
    strictPort: true,
    proxy: {
      "/api": { target: API, changeOrigin: true, configure: (proxy) => proxy.on("proxyReq", vouch) },
      "/ws": { target: API.replace(/^http/, "ws"), ws: true, changeOrigin: true, configure: (proxy) => proxy.on("proxyReqWs", vouch) },
    },
  },
});
