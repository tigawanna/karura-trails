import { markLocalEventsFlushed } from "@/data-access-layer/pglite/local-events";
import type { PgliteDb } from "@/lib/pglite/client";
import type { SyncPushRequest } from "@/types/sync";

const DEVICE_ID_KEY = "karura-map-device-id";

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function flushLocalEventsToSync(db: PgliteDb) {
  const { listPendingLocalEvents } = await import("@/data-access-layer/pglite/local-events");
  const pending = await listPendingLocalEvents(db);
  if (pending.length === 0) {
    return { pushed: 0 };
  }

  const deviceId = getDeviceId();
  const body: SyncPushRequest = {
    deviceId,
    events: pending.map((event) => ({
      id: event.id,
      deviceId,
      table: event.tableName,
      rowId: event.rowId,
      action: event.action as SyncPushRequest["events"][number]["action"],
      payload: JSON.parse(event.payloadJson) as Record<string, unknown>,
      createdAt: event.createdAt.toISOString(),
    })),
  };

  const response = await fetch("/api/sync/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to flush local events to sync API.");
  }

  await markLocalEventsFlushed(
    db,
    pending.map((event) => event.id),
  );

  return { pushed: pending.length };
}
