import type { SidebarItem } from "@/components/sidebar/types";
import { ClipboardList, LayoutDashboard, Map, RefreshCw, Table2 } from "lucide-react";

export const dashboard_account_routes = [] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Review events", href: "/admin/events", icon: ClipboardList },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Sync", href: "/sync", icon: RefreshCw },
    { title: "Map", href: "/maps", icon: Map },
    { title: "Data explorer", href: "/map", icon: Table2 },
  ];
}
