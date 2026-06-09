import type { SyncEventRecord, SyncPullResponse } from "@/types/sync";

export interface SyncEventsListResponse {
  events: SyncEventRecord[];
}

export async function fetchAdminSyncEvents(): Promise<SyncEventsListResponse> {
  const response = await fetch("/api/sync/events?includeUnverified=true&limit=100", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load sync events");
  }

  return response.json() as Promise<SyncEventsListResponse>;
}

export async function fetchSyncEventsPull(after?: string | null): Promise<SyncPullResponse> {
  const params = new URLSearchParams({ limit: "100" });
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

export async function verifySyncEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/sync/events/${eventId}/verify`, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to verify event");
  }
}
