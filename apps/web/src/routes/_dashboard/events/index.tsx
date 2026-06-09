import { Button } from "@/components/ui/button";
import { MainLoader } from "@/components/wrappers/MainLoader";
import { fetchAdminSyncEvents, verifySyncEvent } from "@/services/sync/sync.api";
import type { SyncEventRecord } from "@/types/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
export const Route = createFileRoute("/_dashboard/events/")({
  component: EventsPage,
});

function EventsPage() {
  return (
    <Suspense fallback={<MainLoader />}>
      <EventsPanel />
    </Suspense>
  );
}

function EventsPanel() {
  const qc = useQueryClient();
  const eventsQuery = useQuery({
    queryKey: ["sync-events", "admin"],
    queryFn: fetchAdminSyncEvents,
  });

  const verifyMutation = useMutation({
    mutationFn: verifySyncEvent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sync-events", "admin"] });
    },
  });

  if (eventsQuery.isLoading) {
    return <MainLoader />;
  }

  if (eventsQuery.isError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm">
        Could not load sync events.
      </div>
    );
  }

  const events = eventsQuery.data?.events ?? [];

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sync events</h1>
        <p className="mt-2 max-w-2xl text-base-content/70">
          Events pushed from mobile devices land here first. Verified events are pulled into the map
          workspace automatically. Seed Karura trail data with{" "}
          <code className="rounded bg-base-200 px-1.5 py-0.5 text-xs">pnpm db:seed:events</code>{" "}
          after starting the dev server once.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">
          No events yet. Run <code>pnpm db:seed:events</code> or push from mobile to{" "}
          <code>/api/sync/events</code>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-base-300">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Device</th>
                <th>Table</th>
                <th>Action</th>
                <th>Created</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((event: SyncEventRecord) => (
                <tr key={event.id}>
                  <td className="font-mono text-xs">{event.id.slice(0, 12)}…</td>
                  <td className="font-mono text-xs">{event.deviceId.slice(0, 8)}…</td>
                  <td>{event.tableName}</td>
                  <td>{event.action}</td>
                  <td className="text-xs">{event.createdAt}</td>
                  <td>{event.verified ? "Verified" : "Pending"}</td>
                  <td>
                    {!event.verified ? (
                      <Button
                        size="sm"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(event.id)}
                      >
                        Verify
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
