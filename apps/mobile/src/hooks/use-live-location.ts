import { useDeviceLocation } from "@/hooks/use-device-location";

export function useLiveLocation(_active = true) {
  const { location } = useDeviceLocation();
  return location ?? null;
}
