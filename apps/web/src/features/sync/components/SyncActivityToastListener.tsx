import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const SYNC_TOAST_POSITION = "bottom-left" as const;

function syncToastId(page: number) {
  return `sync-page-${page}`;
}

export function SyncActivityToastListener() {
  const status = useSyncActivityStore((state) => state.status);
  const currentPage = useSyncActivityStore((state) => state.currentPage);
  const totalPages = useSyncActivityStore((state) => state.totalPages);
  const remainingCount = useSyncActivityStore((state) => state.remainingCount);
  const eventsApplied = useSyncActivityStore((state) => state.eventsApplied);
  const lastError = useSyncActivityStore((state) => state.lastError);
  const lastToastedPageRef = useRef(0);

  useEffect(() => {
    if (status !== "syncing" || currentPage <= 0) {
      return;
    }

    if (currentPage === lastToastedPageRef.current) {
      toast.loading(
        `Page ${currentPage}${totalPages > 0 ? ` of ${totalPages}` : ""} · ${remainingCount} remaining`,
        {
          id: syncToastId(currentPage),
          position: SYNC_TOAST_POSITION,
          duration: Number.POSITIVE_INFINITY,
        },
      );
      return;
    }

    if (lastToastedPageRef.current > 0) {
      toast.dismiss(syncToastId(lastToastedPageRef.current));
    }

    lastToastedPageRef.current = currentPage;
    toast.loading(
      `Page ${currentPage}${totalPages > 0 ? ` of ${totalPages}` : ""} · ${remainingCount} remaining`,
      {
        id: syncToastId(currentPage),
        position: SYNC_TOAST_POSITION,
        duration: Number.POSITIVE_INFINITY,
      },
    );
  }, [currentPage, remainingCount, status, totalPages]);

  useEffect(() => {
    if (status !== "idle" || lastToastedPageRef.current <= 0) {
      return;
    }

    toast.dismiss(syncToastId(lastToastedPageRef.current));
    lastToastedPageRef.current = 0;

    if (eventsApplied > 0) {
      toast.success(`Synced ${eventsApplied} event(s)`, {
        position: SYNC_TOAST_POSITION,
        duration: 3000,
      });
    }
  }, [eventsApplied, status]);

  useEffect(() => {
    if (status !== "error" || !lastError) {
      return;
    }

    if (lastToastedPageRef.current > 0) {
      toast.dismiss(syncToastId(lastToastedPageRef.current));
      lastToastedPageRef.current = 0;
    }

    toast.error(lastError, {
      position: SYNC_TOAST_POSITION,
      duration: 5000,
    });
  }, [lastError, status]);

  return null;
}
