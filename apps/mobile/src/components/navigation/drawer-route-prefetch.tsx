import { useRouter } from "expo-router";
import { useEffect } from "react";

const DRAWER_PREFETCH_ROUTES = ["/trails", "/sync-queue", "/settings"] as const;

export function DrawerRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const route of DRAWER_PREFETCH_ROUTES) {
      router.prefetch(route);
    }
  }, [router]);

  return null;
}
