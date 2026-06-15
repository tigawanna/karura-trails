import { isDevBuild } from "@/lib/dev/is-dev-build";
import { useSettingsStore } from "@/stores/settings-store";

export function useAdminMode(): boolean {
  const expoAdminMode = useSettingsStore((state) => state.expoAdminMode);
  const envAdminMode = process.env.EXPO_PUBLIC_ADMIN_MODE === "1";
  return isDevBuild() && (expoAdminMode || envAdminMode);
}
