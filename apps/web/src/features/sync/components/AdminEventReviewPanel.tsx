import { Button } from "@/components/ui/button";
import { mapPointsQueryOptions } from "@/data-access-layer/pglite/map-points";
import { EventReviewMapPreview } from "@/features/sync/components/EventReviewMapPreview";
import { buildEventMapPreview } from "@/lib/sync/event-map-preview";
import { useDashboardMap } from "@/routes/_dashboard/-components/DashboardPgliteShell.client";
import { usePglite } from "@/lib/pglite/components/PgliteProvider.client";
import { useSyncActivityStore } from "@/lib/sync/sync-activity-store";
import {
  fetchAdminSyncEvents,
  parseSyncEventPayload,
  verifySyncEvent,
} from "@/services/sync/sync.api";
import type { SyncEventRecord } from "@/types/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { toast } from "sonner";

export function AdminEventReviewPanel() {
  const { db } = usePglite();
  const { mapId } = useDashboardMap();
  const queryClient = useQueryClient();
  const requestSyncNow = useSyncActivityStore((state) => state.requestSyncNow);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["sync-events", "admin", "unverified"],
    queryFn: () => fetchAdminSyncEvents(null, 1, 200),
  });

  const mapPointsQuery = useQuery({
    ...mapPointsQueryOptions(db, mapId ?? 0),
    enabled: mapId != null,
  });

  const verifyMutation = useMutation({
    mutationFn: verifySyncEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sync-events"] });
      await queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      toast.success("Event verified.");
    },
    onError: () => {
      toast.error("Failed to verify event.");
    },
  });

  const pendingEvents = useMemo(
    () => (eventsQuery.data?.events ?? []).filter((event) => !event.verified),
    [eventsQuery.data?.events],
  );

  const selectedEvent =
    pendingEvents.find((event) => event.id === selectedEventId) ?? pendingEvents[0] ?? null;

  const preview = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }
    return buildEventMapPreview(selectedEvent, mapPointsQuery.data ?? []);
  }, [mapPointsQuery.data, selectedEvent]);

  return (
    <section className="flex h-[calc(100svh-8rem)] min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review sync events</h1>
          <p className="mt-2 max-w-3xl text-base-content/70">
            Inspect unverified upstream changes, approve valid edits, then pull verified events into
            the local map database.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => requestSyncNow()}>
            Pull verified events
          </Button>
          <Button variant="outline" onClick={() => void eventsQuery.refetch()}>
            Refresh queue
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-base-300">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={38} minSize={24}>
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-base-300 px-3 py-2 text-sm font-medium">
                Pending events ({pendingEvents.length})
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {pendingEvents.map((event: SyncEventRecord) => {
                  const payload = parseSyncEventPayload(event);
                  const label =
                    typeof payload.name === "string"
                      ? payload.name
                      : `${event.tableName} ${event.action}`;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`block w-full border-b border-base-300 px-3 py-3 text-left text-sm hover:bg-base-200/70 ${
                        selectedEvent?.id === event.id ? "bg-base-200" : ""
                      }`}
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <div className="font-medium">{label}</div>
                      <div className="mt-1 font-mono text-xs text-base-content/60">
                        {event.id.slice(0, 18)}…
                      </div>
                      <div className="mt-1 text-xs text-base-content/60">
                        {event.tableName} · {event.action}
                      </div>
                    </button>
                  );
                })}
                {pendingEvents.length === 0 ? (
                  <p className="p-6 text-center text-sm text-base-content/60">
                    No unverified events in the remote queue.
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>
          <Separator className="w-1 bg-base-content/10" />
          <Panel defaultSize={62} minSize={36}>
            <div className="flex h-full min-h-0 flex-col">
              {selectedEvent && preview ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
                    <div>
                      <p className="font-medium">{preview.summary}</p>
                      <p className="font-mono text-xs text-base-content/60">{selectedEvent.id}</p>
                    </div>
                    <Button
                      disabled={verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(selectedEvent.id)}
                    >
                      Approve
                    </Button>
                  </div>
                  <div className="grid min-h-0 flex-1 grid-rows-[minmax(280px,1fr)_220px]">
                    <div className="min-h-0 p-3">
                      <EventReviewMapPreview preview={preview} />
                    </div>
                    <div className="overflow-auto border-t border-base-300 p-4">
                      <pre className="overflow-auto rounded-lg bg-base-200/60 p-3 text-xs">
                        {JSON.stringify(parseSyncEventPayload(selectedEvent), null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-sm text-base-content/60">
                  Select a pending event to preview its map impact.
                </div>
              )}
            </div>
          </Panel>
        </Group>
      </div>
    </section>
  );
}
