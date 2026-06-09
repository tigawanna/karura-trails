import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { MainLoader } from "@/components/wrappers/MainLoader";

const MapWorkspaceShell = lazy(
  () => import("@/routes/_dashboard/maps/-components/MapWorkspaceShell.client"),
);

export const Route = createFileRoute("/_dashboard/maps")({
  component: MapsLayoutRoute,
  ssr: false,
});

function MapsLayoutRoute() {
  return (
    <Suspense fallback={<MainLoader />}>
      <MapWorkspaceShell />
    </Suspense>
  );
}
