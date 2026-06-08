import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { MainLoader } from "@/components/wrappers/MainLoader";

const MapShell = lazy(() => import("@/routes/_dashboard/map/-components/MapShell.client"));

export const Route = createFileRoute("/_dashboard/map")({
  component: MapLayoutRoute,
  ssr: false,
});

function MapLayoutRoute() {
  return (
    <Suspense fallback={<MainLoader />}>
      <MapShell />
    </Suspense>
  );
}
