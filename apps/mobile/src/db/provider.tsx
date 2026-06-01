import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { initializeDatabase } from "./init";
import { seedTrailsFromGeoJSON } from "./seed";
import type { TrailFeatureCollection } from "@/types/geojson";

import trailsGeoJSON from "../../assets/data/trails.geojson";

interface DatabaseContextValue {
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({ isReady: false });

export function useDatabase(): DatabaseContextValue {
  return useContext(DatabaseContext);
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    try {
      initializeDatabase();
      seedTrailsFromGeoJSON(trailsGeoJSON as unknown as TrailFeatureCollection);
      setIsReady(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initialize database";
      setError(message);
    }
  }, []);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>Database Error</Text>
        <Text style={{ color: colors.onSurface, marginTop: 8 }}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onSurface, marginTop: 12 }}>Preparing trails...</Text>
      </View>
    );
  }

  return <DatabaseContext.Provider value={{ isReady }}>{children}</DatabaseContext.Provider>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
