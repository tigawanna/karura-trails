import React, { createContext, useContext, useEffect, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

import { getErrorMessage, logCapturedError } from "@/lib/log-captured-error";

import { getDatabaseErrorContent } from "./error-content";
import { initializeDatabase } from "./init";
import { loadTrailsGeoJSON } from "@/lib/parse-trails-geojson";

import { seedTrailsFromGeoJSON } from "./seed";

const PROVIDER_SOURCE = "src/db/provider.tsx";

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

    let phase = "initializeDatabase";

    try {
      initializeDatabase();
      phase = "seedTrailsFromGeoJSON";
      seedTrailsFromGeoJSON(loadTrailsGeoJSON());
      setIsReady(true);
    } catch (err: unknown) {
      logCapturedError("DatabaseProvider", err, {
        source: PROVIDER_SOURCE,
        phase,
        extra: { initAttempt },
      });
      setError(getErrorMessage(err, "Failed to initialize database"));
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
