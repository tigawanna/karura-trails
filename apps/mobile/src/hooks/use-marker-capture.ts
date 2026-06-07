import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useMemo, useState } from "react";

import type { PointCategory } from "@/lib/drizzle/schema/points";
import { queryKeyPrefixes } from "@/lib/tanstack/query/client";
import { persistMarkerPhoto } from "@/services/points/marker-photo-storage";
import {
  createMarker,
  resolveMarkerElevation,
  type MarkerDraftCoordinates,
} from "@/services/points/points.service";

export interface MarkerCaptureDraft {
  lng: number;
  lat: number;
  gpsAltitude: number | null;
}

interface UseMarkerCaptureOptions {
  initialDraft: MarkerCaptureDraft | null;
  onSaved: () => void;
}

const DEFAULT_CATEGORY: PointCategory = "junction";

export function useMarkerCapture({ initialDraft, onSaved }: UseMarkerCaptureOptions) {
  const queryClient = useQueryClient();
  const [lng, setLng] = useState(() => initialDraft?.lng.toFixed(6) ?? "");
  const [lat, setLat] = useState(() => initialDraft?.lat.toFixed(6) ?? "");
  const [gpsAltitude, setGpsAltitude] = useState<number | null>(
    () => initialDraft?.gpsAltitude ?? null,
  );
  const [manualElevation, setManualElevation] = useState("");
  const [elevationTouched, setElevationTouched] = useState(false);
  const [category, setCategory] = useState<PointCategory>(DEFAULT_CATEGORY);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedCoordinates = useMemo((): MarkerDraftCoordinates | null => {
    const parsedLng = Number.parseFloat(lng);
    const parsedLat = Number.parseFloat(lat);
    if (!Number.isFinite(parsedLng) || !Number.isFinite(parsedLat)) {
      return null;
    }
    return { lng: parsedLng, lat: parsedLat, gpsAltitude };
  }, [gpsAltitude, lat, lng]);

  const resolvedElevation = useMemo(() => {
    if (!parsedCoordinates) {
      return { elevation: null, elevationSource: null };
    }
    return resolveMarkerElevation(parsedCoordinates);
  }, [parsedCoordinates]);

  const displayElevation = elevationTouched
    ? manualElevation
    : String(resolvedElevation.elevation ?? "");

  const pickPhoto = useCallback(async () => {
    if (photoUris.length >= 2) {
      setErrorMessage("You can attach up to two photos.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Camera permission is required to take marker photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      return;
    }

    const storedUri = await persistMarkerPhoto(asset.uri);
    setPhotoUris((current) => [...current, storedUri].slice(0, 2));
    setErrorMessage(null);
  }, [photoUris.length]);

  const removePhoto = useCallback((uri: string) => {
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!parsedCoordinates) {
        throw new Error("Enter valid latitude and longitude values.");
      }

      const elevationValue = elevationTouched
        ? Number.parseFloat(manualElevation)
        : resolvedElevation.elevation;

      if (elevationTouched && !Number.isFinite(elevationValue)) {
        throw new Error("Enter a valid elevation in meters, or clear the field.");
      }

      await createMarker({
        lng: parsedCoordinates.lng,
        lat: parsedCoordinates.lat,
        category,
        name: name.trim() || null,
        description: description.trim() || null,
        elevation: elevationTouched ? elevationValue : resolvedElevation.elevation,
        elevationSource: elevationTouched ? "manual" : resolvedElevation.elevationSource,
        photoUri: photoUris[0] ?? null,
        secondaryPhotoUri: photoUris[1] ?? null,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.capturedPoints]],
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.capturedPoints] });
      onSaved();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not save marker";
      setErrorMessage(message);
    },
  });

  return {
    lng,
    lat,
    gpsAltitude,
    category,
    name,
    description,
    photoUris,
    displayElevation,
    resolvedElevation,
    elevationTouched,
    errorMessage,
    isSaving: saveMutation.isPending,
    setLng,
    setLat,
    setCategory,
    setName,
    setDescription,
    setManualElevation: (value: string) => {
      setElevationTouched(true);
      setManualElevation(value);
    },
    pickPhoto,
    removePhoto,
    save: () => saveMutation.mutate(),
  };
}
