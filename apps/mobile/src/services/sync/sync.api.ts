import type { SyncPullResponse } from "@/lib/sync/sync.types";
import { syncLog, syncWarn } from "@/lib/sync/sync-log";

function resolveSyncApiBaseUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_SYNC_API_URL?.trim();
  if (!value) {
    return null;
  }
  return value.replace(/\/$/, "");
}

function resolveSyncApiSecret(): string | null {
  const value = process.env.EXPO_PUBLIC_SYNC_API_SECRET?.trim();
  if (!value) {
    return null;
  }
  return value;
}

export function getSyncApiBaseUrl(): string | null {
  return resolveSyncApiBaseUrl();
}

export function getSyncApiSecret(): string | null {
  return resolveSyncApiSecret();
}

export function buildSyncRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = resolveSyncApiSecret();
  if (secret) {
    headers["x-sync-secret"] = secret;
  }
  return headers;
}

export async function fetchSyncEventsPull(
  after?: string | null,
  page = 1,
  limit = 100,
): Promise<SyncPullResponse> {
  const baseUrl = resolveSyncApiBaseUrl();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_SYNC_API_URL is not configured.");
  }

  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (after) {
    params.set("after", after);
  }

  const url = `${baseUrl}/api/sync/events?${params.toString()}`;
  syncLog("pull request", { url, after: after ?? null, page, limit });

  const response = await fetch(url, {
    headers: buildSyncRequestHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    syncWarn("pull failed", { status: response.status, body: body.slice(0, 300) });
    throw new Error(`Failed to pull sync events (${response.status}).`);
  }

  const result = (await response.json()) as SyncPullResponse;
  syncLog("pull response", {
    events: result.events.length,
    hasMore: result.hasMore,
    page: result.page,
  });
  return result;
}
