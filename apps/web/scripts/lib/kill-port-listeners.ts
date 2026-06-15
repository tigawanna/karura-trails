import { execSync } from "node:child_process";

export function killPortListeners(port: number) {
  try {
    const output = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
    if (!output) {
      return;
    }
    for (const pid of output.split("\n")) {
      const numericPid = Number(pid);
      if (Number.isFinite(numericPid) && numericPid > 0) {
        try {
          process.kill(numericPid, "SIGTERM");
        } catch {}
      }
    }
  } catch {}
}
