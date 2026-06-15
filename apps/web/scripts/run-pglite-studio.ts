import { spawn } from "node:child_process";
import { killPortListeners } from "./lib/kill-port-listeners";

const studioPort = process.env.DRIZZLE_STUDIO_PGLITE_PORT ?? "4984";

killPortListeners(Number(studioPort));

const child = spawn(
  "drizzle-kit",
  ["studio", "--config", "drizzle.config.pglite.ts", "--port", studioPort],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      PGLITE_USE_BROWSER_PROXY: "true",
    },
  },
);

function shutdown(signal: NodeJS.Signals) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(0);
    return;
  }
  process.exit(code ?? 0);
});
