import { migrate } from "drizzle-orm/op-sqlite/migrator";
import { useEffect, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { loadTrailsGeoJSON } from "@/lib/parse-trails-geojson";

import { opsqliteDb } from "./client";
import { db } from "./drizzle";
import { getDatabaseErrorContent } from "./error-content";
import { seedTrailsFromGeoJSON } from "./seed";
import { initializeSpatialDatabase } from "./spatial-setup";
import migrations from "@/drizzle/migrations";

interface InitDatabaseProps {
  children?: React.ReactNode;
}

export function InitDatabase({ children }: InitDatabaseProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        await migrate(db, migrations);
        if (cancelled) return;

        initializeSpatialDatabase(opsqliteDb);
        seedTrailsFromGeoJSON(loadTrailsGeoJSON());

        if (!cancelled) {
          setReady(true);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to initialize database";
          setError(message);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    const content = getDatabaseErrorContent(error);

    return (
      <ErrorState
        testID="database-error"
        title={content.title}
        message={content.message}
        hint={content.hint}
        details={error}
      />
    );
  }

  if (!ready) {
    return <LoadingState testID="database-loading" message="Preparing trails…" />;
  }

  return children;
}
