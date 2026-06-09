import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";

export function SyncActivityHeaderBadge() {
  const status = useSyncActivityStore((state) => state.status);
  const currentPage = useSyncActivityStore((state) => state.currentPage);
  const totalPages = useSyncActivityStore((state) => state.totalPages);
  const remainingCount = useSyncActivityStore((state) => state.remainingCount);

  if (status !== "syncing") {
    return null;
  }

  const pageLabel =
    totalPages > 0 ? `Syncing page ${currentPage} of ${totalPages}` : "Syncing events";
  const remainingLabel = remainingCount > 0 ? ` · ${remainingCount} remaining` : "";

  return (
    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {pageLabel}
      {remainingLabel}
    </span>
  );
}
