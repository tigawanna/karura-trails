const SYNC_CURSOR_KEY = "karura-sync-pull-cursor";

export function readSyncPullCursor(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(SYNC_CURSOR_KEY);
}

export function writeSyncPullCursor(cursor: string | null) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (!cursor) {
    localStorage.removeItem(SYNC_CURSOR_KEY);
    return;
  }
  localStorage.setItem(SYNC_CURSOR_KEY, cursor);
}
