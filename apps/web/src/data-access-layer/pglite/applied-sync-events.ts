import { appliedSyncEventTable } from "@/lib/pglite/schema/applied-sync-event.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { SyncEventRecord } from "@/types/sync";
import { desc } from "drizzle-orm";

export async function getLatestAppliedSyncEventId(db: PgliteDb): Promise<string | null> {
  const [row] = await db
    .select({ id: appliedSyncEventTable.id })
    .from(appliedSyncEventTable)
    .orderBy(desc(appliedSyncEventTable.id))
    .limit(1);
  return row?.id ?? null;
}

export async function listAppliedSyncEvents(db: PgliteDb, limit = 200) {
  return db
    .select()
    .from(appliedSyncEventTable)
    .orderBy(desc(appliedSyncEventTable.appliedAt))
    .limit(limit);
}

export async function getAppliedSyncEventIdSet(db: PgliteDb): Promise<Set<string>> {
  const rows = await db.select({ id: appliedSyncEventTable.id }).from(appliedSyncEventTable);
  return new Set(rows.map((row) => row.id));
}

export async function markSyncEventsApplied(
  db: PgliteDb,
  events: SyncEventRecord[],
  skippedIds: Set<string>,
) {
  if (events.length === 0) {
    return;
  }
  await db
    .insert(appliedSyncEventTable)
    .values(
      events.map((event) => ({
        id: event.id,
        tableName: event.tableName,
        action: event.action,
        skipped: skippedIds.has(event.id),
      })),
    )
    .onConflictDoNothing({ target: appliedSyncEventTable.id });
}
