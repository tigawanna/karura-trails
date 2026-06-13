import {
  listPendingOutboundSyncEvents,
  markOutboundSyncEventsSynced,
  toSyncEventPayload,
} from "@/lib/sync/outbound-sync-events";
import { getDeviceId } from "@/lib/sync/device-id";
import type { SyncPushRequest, SyncPushResponse } from "@/types/sync";
import { getSyncApiBaseUrl } from "@/services/sync/sync.api";

const PUSH_BATCH_LIMIT = 50;

export async function pushSyncEvents(eventIds?: string[]): Promise<{ pushed: number }> {
  const baseUrl = getSyncApiBaseUrl();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_SYNC_API_URL is not configured.");
  }

  const deviceId = await getDeviceId();
  let pending = await listPendingOutboundSyncEvents();
  if (eventIds && eventIds.length > 0) {
    const idSet = new Set(eventIds);
    pending = pending.filter((event) => idSet.has(event.id));
  }

  if (pending.length === 0) {
    return { pushed: 0 };
  }

  let totalPushed = 0;
  let batch = pending.slice(0, PUSH_BATCH_LIMIT);

  while (batch.length > 0) {
    const body: SyncPushRequest = {
      deviceId,
      events: batch.map((event) => toSyncEventPayload(event, deviceId)),
    };

    const response = await fetch(`${baseUrl}/api/sync/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to push sync events to server.");
    }

    const result = (await response.json()) as SyncPushResponse;
    const acceptedIds = batch.slice(0, result.accepted).map((event) => event.id);
    await markOutboundSyncEventsSynced(acceptedIds);
    totalPushed += result.accepted;

    if (!result.hasMore || result.accepted < batch.length) {
      break;
    }

    pending = await listPendingOutboundSyncEvents();
    if (eventIds && eventIds.length > 0) {
      const idSet = new Set(eventIds);
      pending = pending.filter((event) => idSet.has(event.id));
    }
    batch = pending.slice(0, PUSH_BATCH_LIMIT);
  }

  return { pushed: totalPushed };
}
