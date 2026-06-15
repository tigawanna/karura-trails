import * as FileSystem from "expo-file-system/legacy";

import type { DrizzleDB } from "@/lib/drizzle/client";
import { syncEvents } from "@/lib/drizzle/schema";
import type { SyncEventPayload, SyncEventRecord, SyncEventsSeedJson } from "@/lib/sync/sync.types";

const REPLAY_CACHE_FILENAME = "karura-sync-replay-cache.json";

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

async function getReplayCachePath(): Promise<string> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("Document storage is unavailable");
  }
  return `${baseDir}${REPLAY_CACHE_FILENAME}`;
}

function recordToPayload(record: SyncEventRecord): SyncEventPayload {
  return {
    id: record.id,
    deviceId: record.deviceId,
    table: record.tableName,
    rowId: record.rowId,
    action: record.action,
    payload: JSON.parse(record.payloadJson) as Record<string, unknown>,
    createdAt: record.createdAt,
  };
}

function mergeSeedEvents(
  existing: SyncEventPayload[],
  incoming: SyncEventPayload[],
): SyncEventPayload[] {
  const byId = new Map<string, SyncEventPayload>();
  for (const event of existing) {
    byId.set(event.id, event);
  }
  for (const event of incoming) {
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export async function readSyncReplayCache(): Promise<SyncEventsSeedJson | null> {
  const path = await getReplayCachePath();
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    return null;
  }

  const raw = await FileSystem.readAsStringAsync(path);
  const parsed = JSON.parse(raw) as unknown;
  if (!isSyncEventsSeed(parsed)) {
    return null;
  }

  return parsed;
}

export async function writeSyncReplayCache(seed: SyncEventsSeedJson): Promise<void> {
  const path = await getReplayCachePath();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(seed));
}

export async function persistSyncEventsSeed(seed: SyncEventsSeedJson): Promise<void> {
  await writeSyncReplayCache({
    ...seed,
    format: "karura-sync-events-seed",
    generatedAt: new Date().toISOString(),
    events: mergeSeedEvents([], seed.events),
  });
}

export async function mergeSyncReplayCacheRecords(records: SyncEventRecord[]): Promise<number> {
  if (records.length === 0) {
    return 0;
  }

  const existing = (await readSyncReplayCache())?.events ?? [];
  const merged = mergeSeedEvents(existing, records.map(recordToPayload));
  await writeSyncReplayCache({
    version: 1,
    format: "karura-sync-events-seed",
    generatedAt: new Date().toISOString(),
    events: merged,
  });
  return merged.length;
}

export async function readSyncReplayCacheSummary(): Promise<{
  eventCount: number;
  generatedAt: string | null;
} | null> {
  const cache = await readSyncReplayCache();
  if (!cache) {
    return null;
  }

  return {
    eventCount: cache.events.length,
    generatedAt: cache.generatedAt ?? null,
  };
}

function mapSyncEventRow(row: typeof syncEvents.$inferSelect): SyncEventRecord {
  return {
    id: row.id,
    deviceId: row.deviceId,
    tableName: row.tableName,
    rowId: row.rowId,
    action: row.action as SyncEventRecord["action"],
    payloadJson: row.payloadJson,
    createdAt: row.createdAt,
    verified: row.verified,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
  };
}

export async function snapshotDatabaseSyncEventsToReplayCache(
  database: DrizzleDB,
): Promise<number> {
  const rows = await database.select().from(syncEvents);
  return mergeSyncReplayCacheRecords(rows.map(mapSyncEventRow));
}
