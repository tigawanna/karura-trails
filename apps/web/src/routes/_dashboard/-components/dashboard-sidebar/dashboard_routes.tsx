import type { SidebarItem } from "@/components/sidebar/types";
import { ClipboardList, LayoutDashboard, Map } from "lucide-react";

export const dashboard_account_routes = [] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Sync events", href: "/events", icon: ClipboardList },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Map", href: "/dashboard", icon: Map },
  ];
}
