import type { SyncEventsSeedJson } from "@/lib/sync/sync.types";

import rawSeed from "../../../assets/data/karura-events.json";

function isSyncEventsSeed(value: unknown): value is SyncEventsSeedJson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SyncEventsSeedJson;
  return (
    candidate.format === "karura-sync-events-seed" &&
    Array.isArray(candidate.events) &&
    candidate.events.length > 0
  );
}

export function loadSyncEventsSeed(): SyncEventsSeedJson {
  let data: unknown = rawSeed;

  if (typeof data === "string") {
    data = JSON.parse(data) as unknown;
  }

  if (data && typeof data === "object" && "default" in data) {
    data = (data as { default: unknown }).default;
  }

  if (!isSyncEventsSeed(data)) {
    throw new Error(
      "karura-events.json is not a valid sync events seed. Run pnpm generate:events and rebuild.",
    );
  }

  return data;
}
