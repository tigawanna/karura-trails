import { MainLoader } from "@/components/wrappers/MainLoader";
import { createFileRoute } from "@tanstack/react-router";
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
            Open the map workspace to view and edit Karura trail markers, segments, and routing
            data.
          </p>
          <a href="/map" className="btn mt-4 btn-sm btn-primary">
            Open map workspace
          </a>
        </div>
      </section>
    </Suspense>
  );
}
