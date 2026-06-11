import { appliedSyncEvents, syncEvents } from "@/lib/drizzle/schema";
import type { DrizzleDB } from "@/lib/drizzle/client";
import type { SyncEventRecord } from "@/lib/sync/sync.types";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";

export async function countUnappliedSyncEvents(database: DrizzleDB): Promise<number> {
  const rows = await database.all<{ c: number }>(sql`
    SELECT COUNT(*) AS c
    FROM sync_events AS se
    LEFT JOIN applied_sync_events AS ae ON ae.id = se.id
    WHERE ae.id IS NULL
  `);
  return rows[0]?.c ?? 0;
}

export async function isSyncBootstrapComplete(database: DrizzleDB): Promise<boolean> {
  return (await countUnappliedSyncEvents(database)) === 0;
}

export async function listUnappliedSyncEvents(
  database: DrizzleDB,
  limit = 100,
): Promise<SyncEventRecord[]> {
  const rows = await database
    .select({
      id: syncEvents.id,
      deviceId: syncEvents.deviceId,
      tableName: syncEvents.tableName,
      rowId: syncEvents.rowId,
      action: syncEvents.action,
      payloadJson: syncEvents.payloadJson,
      createdAt: syncEvents.createdAt,
      verified: syncEvents.verified,
      verifiedAt: syncEvents.verifiedAt,
      verifiedBy: syncEvents.verifiedBy,
    })
    .from(syncEvents)
    .leftJoin(appliedSyncEvents, eq(syncEvents.id, appliedSyncEvents.id))
    .where(isNull(appliedSyncEvents.id))
    .orderBy(asc(syncEvents.id))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    action: row.action as SyncEventRecord["action"],
  }));
}

export async function getLatestAppliedSyncEventId(database: DrizzleDB): Promise<string | null> {
  const [row] = await database
    .select({ id: appliedSyncEvents.id })
    .from(appliedSyncEvents)
    .orderBy(desc(appliedSyncEvents.id))
    .limit(1);
  return row?.id ?? null;
}

export async function markSyncEventsApplied(
  database: DrizzleDB,
  events: SyncEventRecord[],
  skippedIds: Set<string>,
) {
  if (events.length === 0) {
    return;
  }

  await database
    .insert(appliedSyncEvents)
    .values(
      events.map((event) => ({
        id: event.id,
        tableName: event.tableName,
        action: event.action,
        skipped: skippedIds.has(event.id),
      })),
    )
    .onConflictDoNothing({ target: appliedSyncEvents.id });
}
