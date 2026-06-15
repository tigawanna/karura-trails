import { spawn } from "node:child_process";
import { killPortListeners } from "./lib/kill-port-listeners";

const tcpPort = process.env.PGLITE_BROWSER_PROXY_TCP_PORT ?? "15432";
const wsPort = process.env.PGLITE_BROWSER_PROXY_WS_PORT ?? "15433";

killPortListeners(Number(tcpPort));
killPortListeners(Number(wsPort));

const child = spawn("pg-browser-proxy", ["-t", tcpPort, "-w", wsPort], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

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
