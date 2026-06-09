import { MainLoader } from "@/components/wrappers/MainLoader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_dashboard/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <Suspense fallback={<MainLoader />}>
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trail map workspace</h1>
          <p className="mt-2 max-w-2xl text-base-content/70">
            Admin dashboard for Karura Trails. Review sync events, verify field changes, and prepare
            verified data for mobile and web map clients.
          </p>
        </div>
        <div className="rounded-2xl border border-base-content/10 bg-base-100/70 p-6">
          <p className="text-sm text-base-content/70">
            Open the full map workspace to edit markers on the map, or use the data explorer to
            browse tables and focus rows on the map.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/maps" className="btn btn-sm btn-primary">
              Open map workspace
            </Link>
            <Link to="/map" className="btn btn-outline btn-sm">
              Browse data tables
            </Link>
          </div>
        </div>
      </section>
    </Suspense>
  );
}
