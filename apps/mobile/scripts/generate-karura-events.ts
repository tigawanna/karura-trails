import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RoutingGraphSeedJson } from "../src/geo/routing-graph-seed.types";
import { convertRoutingGraphSeedToEvents } from "../src/lib/sync/convert-routing-graph-seed-to-events";
import type { SyncEventsSeedJson } from "../src/lib/sync/sync.types";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDir, "..");
const trailsPath = resolve(mobileRoot, "assets/data/karura-trails.json");
const eventsPath = resolve(mobileRoot, "assets/data/karura-events.json");

function main() {
  const seed = JSON.parse(readFileSync(trailsPath, "utf8")) as RoutingGraphSeedJson;
  const events = convertRoutingGraphSeedToEvents(seed);
  const payload: SyncEventsSeedJson = {
    version: 1,
    format: "karura-sync-events-seed",
    generatedAt: new Date().toISOString(),
    events,
  };

  writeFileSync(eventsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${events.length} event(s) to ${eventsPath}`);
}

main();
