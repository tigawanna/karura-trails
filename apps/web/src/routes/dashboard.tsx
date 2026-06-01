import { MainLoader } from "@/components/wrappers/MainLoader";
import { AppConfig } from "@/utils/system";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-base-100">
      <header className="flex items-center justify-between border-b border-base-300 px-6 py-4">
        <Link to="/" className="link text-sm font-medium link-hover">
          ← {AppConfig.name}
        </Link>
        <span className="text-sm text-base-content/60">Trail map workspace</span>
      </header>
      <Suspense fallback={<MainLoader />}>
        <section className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="max-w-lg text-base-content/70">
            Map view and trail uploads will live here — open on a larger screen while you tag gaps
            in the forest network.
          </p>
          <div
            className="flex h-[min(60vh,520px)] w-full max-w-5xl items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/50 text-sm text-base-content/50"
            data-test="map-placeholder"
          >
            Map canvas
          </div>
        </section>
      </Suspense>
    </div>
  );
}
