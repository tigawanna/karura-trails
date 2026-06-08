import { SidebarLinks } from "@/components/sidebar/SidebarLinks";
import type { SidebarItem } from "@/components/sidebar/types";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { QueryActivityNprogress } from "@/components/navigation/nprogress/QueryActivityNprogress";
import { TSRBreadCrumbs } from "@/lib/tanstack/router/TSRBreadCrumbs";
import { AppConfig } from "@/utils/system";
import { Outlet } from "@tanstack/react-router";
import { DashboardSidebarFooter } from "./DashboardSidebarFooter";
import { DashboardSidebarHeader } from "./DashboardSidebarHeader";

interface DashboardLayoutProps {
  sidebarRoutes: SidebarItem[];
  sidebarLabel: string;
  accountRoutes: SidebarItem[];
  accountLabel: string;
  adminRoutes: SidebarItem[];
  adminLabel: string;
}

export function DashboardLayout({
  sidebarRoutes,
  sidebarLabel,
  accountRoutes,
  accountLabel,
  adminRoutes,
  adminLabel,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
      <QueryActivityNprogress />
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <DashboardSidebarHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="bg-base-300">
            <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
              {sidebarLabel}
            </SidebarGroupLabel>
            <SidebarLinks links={sidebarRoutes} />
          </SidebarGroup>
          {accountRoutes.length > 0 ? (
            <SidebarGroup className="bg-base-300">
              <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
                {accountLabel}
              </SidebarGroupLabel>
              <SidebarLinks links={accountRoutes} />
            </SidebarGroup>
          ) : null}
          {adminRoutes.length > 0 ? (
            <SidebarGroup className="bg-base-300">
              <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
                {adminLabel}
              </SidebarGroupLabel>
              <SidebarLinks links={adminRoutes} />
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter className="gap-3 pb-3">
          <DashboardSidebarFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-base-100 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <TSRBreadCrumbs />
          </div>
          <div className="ml-auto px-4 text-sm text-base-content/60">{AppConfig.name}</div>
        </header>
        <div className="@container/main flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
