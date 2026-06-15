import type {
  SyncEventsListResponse,
  SyncEventRecord,
  SyncPullResponse,
  VerifySyncEventChanges,
} from "@/types/sync";

export async function fetchPendingSyncEvents(limit = 200): Promise<SyncEventsListResponse> {
  const params = new URLSearchParams({
    pendingOnly: "true",
    limit: String(limit),
  });
  const response = await fetch(`/api/sync/events?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load pending sync events");
  }

  return response.json() as Promise<SyncEventsListResponse>;
}

export async function fetchAdminSyncEvents(
  after?: string | null,
  page = 1,
  limit = 100,
): Promise<SyncEventsListResponse> {
  const params = new URLSearchParams({
    includeUnverified: "true",
    limit: String(limit),
    page: String(page),
  });
  if (after) {
    params.set("after", after);
  }
  const response = await fetch(`/api/sync/events?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load sync events");
  }

  return response.json() as Promise<SyncEventsListResponse>;
}

export async function fetchSyncEventsPull(
  after?: string | null,
  page = 1,
  limit = 100,
): Promise<SyncPullResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (after) {
    params.set("after", after);
  }
  const response = await fetch(`/api/sync/events?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to pull sync events");
  }
  return response.json() as Promise<SyncPullResponse>;
}

export async function fetchUpstreamSyncEventsPreview(
  after?: string | null,
  page = 1,
  limit = 100,
): Promise<SyncEventsListResponse> {
  return fetchSyncEventsPull(after, page, limit);
}

export type { VerifySyncEventChanges } from "@/types/sync";

export async function verifySyncEvent(
  eventId: string,
  changes?: VerifySyncEventChanges,
): Promise<void> {
  const response = await fetch(`/api/sync/events/${eventId}/verify`, {
    method: "PATCH",
    credentials: "include",
    ...(changes
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        }
      : {}),
  });

  if (!response.ok) {
    throw new Error("Failed to verify event");
  }
}

export function parseSyncEventPayload(event: SyncEventRecord): Record<string, unknown> {
  return JSON.parse(event.payloadJson) as Record<string, unknown>;
}
