import { appliedSyncEvents } from "@/lib/drizzle/schema";
import type { DrizzleDB } from "@/lib/drizzle/client";
import type { SyncEventRecord } from "@/lib/sync/sync.types";
import { desc } from "drizzle-orm";

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
