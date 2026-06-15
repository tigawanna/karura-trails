import { MainLoader } from "@/components/wrappers/MainLoader";
import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { RouterNotFoundComponent } from "@/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { RouterErrorComponent } from "@/lib/tanstack/router/routerErrorComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import {
  dashboard_account_routes,
  dashboard_admin_routes,
  getDashboardPrimaryRoutes,
} from "./-components/dashboard-sidebar/dashboard_routes";

const DashboardPgliteShell = lazy(async () => {
  const module = await import("./-components/DashboardPgliteShell.client");
  return { default: module.DashboardPgliteShell };
});

export const Route = createFileRoute("/_dashboard")({
  ssr: false,
  pendingComponent: () => <RouterPendingComponent />,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: ({ error }) => <RouterErrorComponent error={error} />,
  server: {
    middleware: [viewerMiddleware],
  },
  component: DashboardShell,
  beforeLoad: ({ context }) => {
    if (!context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: "/dashboard" } });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Dashboard`,
      },
    ],
  }),
});

function DashboardShell() {
  return (
    <Suspense fallback={<MainLoader />}>
      <DashboardPgliteShell>
        <DashboardLayout
          sidebarRoutes={getDashboardPrimaryRoutes()}
          sidebarLabel="Menu"
          accountRoutes={dashboard_account_routes}
          accountLabel="Account"
          adminRoutes={dashboard_admin_routes}
          adminLabel="Administration"
        />
      </DashboardPgliteShell>
    </Suspense>
  );
}
