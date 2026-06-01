import React, { createContext, useContext, useEffect, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

import { getDatabaseErrorContent } from "./error-content";
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
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    setError(null);
    setIsReady(false);

    try {
      initializeDatabase();
      seedTrailsFromGeoJSON(trailsGeoJSON as unknown as TrailFeatureCollection);
      setIsReady(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initialize database";
      setError(message);
    }
  }, [initAttempt]);

  if (error) {
    const content = getDatabaseErrorContent(error);

    return (
      <ErrorState
        testID="database-error"
        title={content.title}
        message={content.message}
        hint={content.hint}
        details={error}
        onRetry={() => setInitAttempt((attempt) => attempt + 1)}
      />
    );
  }

  if (!isReady) {
    return <LoadingState testID="database-loading" message="Preparing trails…" />;
  }

  return <DatabaseContext.Provider value={{ isReady }}>{children}</DatabaseContext.Provider>;
}
