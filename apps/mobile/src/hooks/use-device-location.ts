import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";

async function getCurrentLocation(): Promise<Location.LocationObject> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export function useDeviceLocation() {
  const queryClient = useQueryClient();

  const {
    data: location,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["device-location"],
    queryFn: getCurrentLocation,
    refetchInterval: 60_000,
    retry: false,
  });

  const { mutate: refreshLocation, isPending: isRefreshing } = useMutation({
    mutationFn: getCurrentLocation,
    onSuccess: (data) => {
      queryClient.setQueryData(["device-location"], data);
    },
  });

  const manuallySetLocation = (lat: number, lng: number) => {
    const existing = queryClient.getQueryData<Location.LocationObject>(["device-location"]);
    queryClient.setQueryData(["device-location"], {
      ...existing,
      timestamp: Date.now(),
      coords: {
        ...existing?.coords,
        latitude: lat,
        longitude: lng,
        altitude: existing?.coords?.altitude ?? null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
    });
  };

  return {
    location,
    errorMsg: error?.message ?? null,
    isLoading,
    isRefreshing,
    refreshLocation,
    manuallySetLocation,
  };
}
