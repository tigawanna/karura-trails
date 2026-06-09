import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import Nprogress from "./Nprogress";

export function SyncActivityNprogress() {
  const isSyncing = useSyncActivityStore((state) => state.status === "syncing");
  return <Nprogress isAnimating={isSyncing} />;
}
