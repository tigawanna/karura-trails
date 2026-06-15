import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import { Loader2 } from "lucide-react";

export function SyncActivityHeaderBadge() {
  const status = useSyncActivityStore((state) => state.status);
  const currentPage = useSyncActivityStore((state) => state.currentPage);
  const totalPages = useSyncActivityStore((state) => state.totalPages);

  if (status !== "syncing" || currentPage <= 0) {
    return null;
  }

  const pageLabel = totalPages > 0 ? `${currentPage}/${totalPages}` : "…";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary"
      title="Syncing verified events in batches"
    >
      <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
      <span className="font-mono leading-none tabular-nums">{pageLabel}</span>
    </span>
  );
}
