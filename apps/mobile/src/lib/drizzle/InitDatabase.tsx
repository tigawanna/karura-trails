import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import migrations from "@/drizzle/migrations";
import { useMigrations } from "drizzle-orm/op-sqlite/migrator";
import { useEffect, useState } from "react";
import { db, ensureSpatialMetadata } from "./client";
import { seedTrailsFromGeoJSON } from "./seed";
import { loadTrailsGeoJSON } from "../parse-trails-geojson";

interface InitDatabaseProps {
  children?: React.ReactNode;
}

export function InitDatabase({ children }: InitDatabaseProps) {
  const { success, error } = useMigrations(db, migrations);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) {
      return;
    }

    async function initialize() {
      await ensureSpatialMetadata();
      const geojson = loadTrailsGeoJSON();
      await seedTrailsFromGeoJSON(db, geojson);
    }

    initialize()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[InitDatabase] initialization failed:", err);
        setInitError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [success]);

  if (error) {
    return (
      <ErrorState
        title="Migration Failed"
        message={error.message}
        testID="init-db-migration-error"
      />
    );
  }

  if (!success) {
    return <LoadingState message="Running migrations…" testID="init-db-migrating" />;
  }

  if (initError) {
    return (
      <ErrorState
        title="Database Init Failed"
        message={initError.message}
        testID="init-db-init-error"
      />
    );
  }

  if (!ready) {
    return <LoadingState message="Preparing database…" testID="init-db-loading" />;
  }

  return children;
}
