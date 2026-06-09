import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAppliedSyncEventIdSet,
  getLatestAppliedSyncEventId,
  listAppliedSyncEvents,
} from "@/data-access-layer/pglite/applied-sync-events";
import { listLocalEvents } from "@/data-access-layer/pglite/local-events";
import { pgliteQueryKeys } from "@/data-access-layer/pglite/query-keys";
import { flushLocalEventsToSync } from "@/features/map/lib/flush-local-events";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { fetchUpstreamSyncEventsPreview, parseSyncEventPayload } from "@/services/sync/sync.api";
import type { SyncEventRecord } from "@/types/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const syncActivity = useSyncActivityStore();
  const requestSyncNow = useSyncActivityStore((state) => state.requestSyncNow);

  const localEventsQuery = useQuery({
    queryKey: pgliteQueryKeys.localEvents(),
    queryFn: () => listLocalEvents(db),
    refetchInterval: 5000,
  });

  const flushMutation = useMutation({
    mutationFn: () => flushLocalEventsToSync(db),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: pgliteQueryKeys.localEvents() });
      await queryClient.invalidateQueries({ queryKey: ["sync-events"] });
      toast.success(`Pushed ${result.pushed} local event(s) upstream.`);
    },
    onError: () => {
      toast.error("Failed to push local events.");
    },
  });

  const localEvents = localEventsQuery.data ?? [];
  const pendingLocalCount = localEvents.filter((event) => !event.flushed).length;

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sync</h1>
        <p className="mt-2 max-w-2xl text-base-content/70">
          Push your map edits upstream or pull verified remote events into your local database.
        </p>
      </div>

      {syncActivity.lastError ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {syncActivity.lastError}
        </div>
      ) : null}

      <Tabs defaultValue="local">
        <TabsList>
          <TabsTrigger value="local">
            Local changes
            {pendingLocalCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {pendingLocalCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="upstream">Upstream</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-base-content/60">
              Changes from map edits. Push them for admin review.
            </p>
            <Button
              variant="outline"
              disabled={flushMutation.isPending || pendingLocalCount === 0}
              onClick={() => flushMutation.mutate()}
            >
              <Upload className={flushMutation.isPending ? "animate-pulse" : ""} />
              Push pending ({pendingLocalCount})
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Table</th>
                  <th>Action</th>
                  <th>Created</th>
                  <th>Pushed</th>
                </tr>
              </thead>
              <tbody>
                {localEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="font-mono text-xs">{event.id.slice(0, 14)}…</td>
                    <td>{event.tableName}</td>
                    <td>{event.action}</td>
                    <td className="text-xs">{event.createdAt.toLocaleString()}</td>
                    <td>{event.flushed ? "Yes" : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {localEvents.length === 0 ? (
              <p className="p-6 text-center text-sm text-base-content/60">
                No local events yet. Edit something on the map to record changes here.
              </p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="upstream" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-base-content/60">
              Verified remote events waiting to be applied locally.
            </p>
            <Button onClick={() => requestSyncNow()} disabled={syncActivity.status === "syncing"}>
              <RefreshCw className={syncActivity.status === "syncing" ? "animate-spin" : ""} />
              Pull verified events
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
              <p className="text-xs tracking-wide text-base-content/60 uppercase">Remaining</p>
              <p className="mt-1 text-lg font-semibold">{syncActivity.remainingCount}</p>
            </div>
            <div className="rounded-xl border border-base-300 p-4">
              <p className="text-xs tracking-wide text-base-content/60 uppercase">
                Applied locally
              </p>
              <p className="mt-1 text-lg font-semibold">
                {statusQuery.data?.appliedRows.length ?? 0}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table table-zebra table-sm">
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
        </TabsContent>
      </Tabs>
    </section>
  );
}
