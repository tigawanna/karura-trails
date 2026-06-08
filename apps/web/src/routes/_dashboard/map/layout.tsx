import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { MainLoader } from "@/components/wrappers/MainLoader";

const PgliteProviderWrapper = lazy(() => import("@/lib/pglite/components/PgliteProviderWrapper"));

export const Route = createFileRoute("/_dashboard/map")({
  component: MapLayoutRoute,
  ssr: false,
});

function MapLayoutRoute() {
  return (
    <Suspense fallback={<MainLoader />}>
      <PgliteProviderWrapper>
        <Outlet />
      </PgliteProviderWrapper>
    </Suspense>
  );
}
