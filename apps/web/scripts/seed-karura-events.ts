import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { convertRoutingGraphSeedToEvents } from "../src/lib/sync/convert-routing-graph-seed-to-events.ts";
import type { RoutingGraphSeedJson } from "../src/types/routing-graph-seed.ts";
import type { SyncEventPayload } from "../src/types/sync.ts";
import { findLocalD1Database } from "./lib/find-local-d1-database.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..");
const seedPath = resolve(repoRoot, "mobile/assets/data/karura-trails.json");
const batchSize = 50;

function loadKaruraSeedJson(): RoutingGraphSeedJson {
  const raw = readFileSync(seedPath, "utf8");
  return JSON.parse(raw) as RoutingGraphSeedJson;
}

function toSeedRow(event: SyncEventPayload) {
  const verifiedAt = new Date().toISOString();
  return [
    event.id,
    event.deviceId,
    event.table,
    event.rowId,
    event.action,
    JSON.stringify(event.payload ?? {}),
    event.createdAt,
    1,
    verifiedAt,
    "system-seed",
  ] as const;
}

function seedDatabase(databasePath: string, events: SyncEventPayload[]) {
  const db = new DatabaseSync(databasePath);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO events (
      id,
      device_id,
      table_name,
      row_id,
      action,
      payload_json,
      created_at,
      verified,
      verified_at,
      verified_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (let index = 0; index < events.length; index += batchSize) {
      const batch = events.slice(index, index + batchSize);
      for (const event of batch) {
        const result = insert.run(...toSeedRow(event));
        inserted += Number(result.changes);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  return inserted;
}

function main() {
  const databasePath =
    process.env.DATABASE_URL?.replace(/^file:/, "") ?? findLocalD1Database(appRoot);
  if (!databasePath) {
    console.error(
      "Local D1 database not found. Start the dev server once or run pnpm db:migrate:local.",
    );
    process.exit(1);
  }

  const seed = loadKaruraSeedJson();
  const events = convertRoutingGraphSeedToEvents(seed);
  const inserted = seedDatabase(databasePath, events);

  console.log(
    `Seeded ${inserted} new event(s) into ${databasePath} (${events.length} total prepared).`,
  );
}

main();
