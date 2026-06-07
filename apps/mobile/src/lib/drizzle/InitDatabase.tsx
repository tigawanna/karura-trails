import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import {
  enrichedRoutingPointsQueryOptions,
  neighborLinksQueryOptions,
} from "@/data-access-layer/routing-graph";
import migrations from "@/drizzle/migrations";
import { loadRoutingGraphSeed } from "@/geo/load-routing-seed";
import { queryClient } from "@/lib/tanstack/query/client";
import { migrate } from "drizzle-orm/op-sqlite/migrator";
import { useEffect, useState } from "react";
import { db, ensureSpatialMetadata, resetLocalDatabase } from "./client";
import { backfillMarkerKinds } from "./backfill-marker-kinds";
import { seedLandmarkTypesFromJson } from "./seed-landmark-types";
import { seedRoutingGraphFromJson } from "./seed-routing-graph";

interface InitDatabaseProps {
  children?: React.ReactNode;
}

export function InitDatabase({ children }: InitDatabaseProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (process.env.EXPO_PUBLIC_RESET_DATABASE === "1") {
          resetLocalDatabase();
        }

        await migrate(db, migrations);
        if (cancelled) {
          return;
        }
        setSuccess(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const nextError = err instanceof Error ? err : new Error(String(err));
        console.error("[InitDatabase] migration failed:", nextError);
        setError(nextError);
        return;
      }

      try {
        await ensureSpatialMetadata();
        const seed = loadRoutingGraphSeed();
        await seedLandmarkTypesFromJson(db, seed);
        await seedRoutingGraphFromJson(db, seed);
        await backfillMarkerKinds(db);
        if (cancelled) {
          return;
        }
        await Promise.all([
          queryClient.prefetchQuery(enrichedRoutingPointsQueryOptions),
          queryClient.prefetchQuery(neighborLinksQueryOptions),
          queryClient.prefetchQuery(landmarkTypesQueryOptions),
        ]);
        if (cancelled) {
          return;
        }
        setReady(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const nextError = err instanceof Error ? err : new Error(String(err));
        console.error("[InitDatabase] initialization failed:", nextError);
        setInitError(nextError);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    console.error("[InitDatabase] migration failed:", error);
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
