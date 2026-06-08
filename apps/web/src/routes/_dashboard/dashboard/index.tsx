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
        <div
          className="flex h-[min(60vh,520px)] w-full items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/50 text-sm text-base-content/50"
          data-test="map-placeholder"
        >
          Map canvas — transplant coming in a follow-up session
        </div>
      </section>
    </Suspense>
  );
}
