import { Button } from "@/components/ui/button";
import {
  getAppliedSyncEventIdSet,
  getLatestAppliedSyncEventId,
  listAppliedSyncEvents,
} from "@/data-access-layer/pglite/applied-sync-events";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { fetchUpstreamSyncEventsPreview, parseSyncEventPayload } from "@/services/sync/sync.api";
import type { SyncEventRecord } from "@/types/sync";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

function formatEventStatus(event: SyncEventRecord, appliedIds: Set<string>) {
  if (appliedIds.has(event.id)) {
    return "Applied locally";
  }
  if (!event.verified) {
    return "Awaiting admin verification";
  }
  return "Pending download";
}

export function SyncStatusPanel() {
  const { db } = usePglite();
  const { mapId } = useDashboardMap();
  const syncActivity = useSyncActivityStore();
  const requestSyncNow = useSyncActivityStore((state) => state.requestSyncNow);

  const statusQuery = useQuery({
    queryKey: ["sync-status", mapId],
    enabled: mapId != null,
    queryFn: async () => {
      const latestLocalId = await getLatestAppliedSyncEventId(db);
      const appliedIds = await getAppliedSyncEventIdSet(db);
      const appliedRows = await listAppliedSyncEvents(db, 100);
      const upstream = await fetchUpstreamSyncEventsPreview(latestLocalId, 1, 100);
      return { latestLocalId, appliedIds, appliedRows, upstream };
    },
    refetchInterval: syncActivity.status === "syncing" ? 2000 : 15000,
  });

  const upstreamEvents = statusQuery.data?.upstream.events ?? syncActivity.upstreamEvents;
  const appliedIds = statusQuery.data?.appliedIds ?? new Set<string>();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sync</h1>
          <p className="mt-2 max-w-2xl text-base-content/70">
            Verified upstream events are pulled into your local map database in batches. Progress
            appears in the dashboard header while a sync is running.
          </p>
        </div>
        <Button onClick={() => requestSyncNow()} disabled={syncActivity.status === "syncing"}>
          <RefreshCw className={syncActivity.status === "syncing" ? "animate-spin" : ""} />
          Sync now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-base-300 p-4">
          <p className="text-xs tracking-wide text-base-content/60 uppercase">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize">{syncActivity.status}</p>
        </div>
        <div className="rounded-xl border border-base-300 p-4">
          <p className="text-xs tracking-wide text-base-content/60 uppercase">Batch progress</p>
          <p className="mt-1 text-lg font-semibold">
            {syncActivity.status === "syncing" && syncActivity.totalPages > 0
              ? `Page ${syncActivity.currentPage} of ${syncActivity.totalPages}`
              : "Idle"}
          </p>
        </div>
        <div className="rounded-xl border border-base-300 p-4">
          <p className="text-xs tracking-wide text-base-content/60 uppercase">Remaining upstream</p>
          <p className="mt-1 text-lg font-semibold">{syncActivity.remainingCount}</p>
        </div>
        <div className="rounded-xl border border-base-300 p-4">
          <p className="text-xs tracking-wide text-base-content/60 uppercase">Applied locally</p>
          <p className="mt-1 text-lg font-semibold">{statusQuery.data?.appliedRows.length ?? 0}</p>
        </div>
      </div>

      {syncActivity.lastError ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {syncActivity.lastError}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>ID</th>
              <th>Table</th>
              <th>Action</th>
              <th>Verified</th>
              <th>Local status</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {upstreamEvents.map((event) => {
              const payload = parseSyncEventPayload(event);
              const label =
                typeof payload.name === "string"
                  ? payload.name
                  : typeof payload.ref === "string"
                    ? payload.ref
                    : event.rowId;
              return (
                <tr key={event.id}>
                  <td className="font-mono text-xs">{event.id.slice(0, 14)}…</td>
                  <td>{event.tableName}</td>
                  <td>{event.action}</td>
                  <td>{event.verified ? "Yes" : "No"}</td>
                  <td>{formatEventStatus(event, appliedIds)}</td>
                  <td className="text-xs">{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {upstreamEvents.length === 0 ? (
          <p className="p-6 text-center text-sm text-base-content/60">
            No upstream events in view.
          </p>
        ) : null}
      </div>
    </section>
  );
}
