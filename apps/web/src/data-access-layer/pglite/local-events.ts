import { createSyncEventId } from "@/lib/sync/create-sync-event-id";
import { localEventTable } from "@/lib/pglite/schema/local-event.schema";
import type { PgliteDb } from "@/lib/pglite/client";
import type { SyncAction } from "@/types/sync";
import { and, asc, eq } from "drizzle-orm";

export type RecordLocalEventInput = {
  tableName: string;
  rowId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
};

export async function recordLocalEvent(db: PgliteDb, input: RecordLocalEventInput) {
  const id = createSyncEventId();
  await db.insert(localEventTable).values({
    id,
    tableName: input.tableName,
    rowId: input.rowId,
    action: input.action,
    payloadJson: JSON.stringify(input.payload),
    flushed: false,
  });
  return id;
}

export async function listPendingLocalEvents(db: PgliteDb) {
  return db
    .select()
    .from(localEventTable)
    .where(eq(localEventTable.flushed, false))
    .orderBy(asc(localEventTable.createdAt));
}

export async function listLocalEvents(db: PgliteDb) {
  return db.select().from(localEventTable).orderBy(asc(localEventTable.createdAt));
}

export async function markLocalEventsFlushed(db: PgliteDb, ids: string[]) {
  if (ids.length === 0) {
    return;
  }
  for (const id of ids) {
    await db
      .update(localEventTable)
      .set({ flushed: true, flushedAt: new Date() })
      .where(and(eq(localEventTable.id, id), eq(localEventTable.flushed, false)));
  }
}
