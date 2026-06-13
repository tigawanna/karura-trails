import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { landmarkTypesQueryOptions } from "@/data-access-layer/landmark-types";
import {
  enrichedRoutingPointsQueryOptions,
  neighborLinksQueryOptions,
} from "@/data-access-layer/routing-graph";
import {
  pendingSyncCountQueryOptions,
  pendingSyncEventsQueryOptions,
} from "@/data-access-layer/sync-queue";
import migrations from "@/drizzle/migrations";
import { queryClient } from "@/lib/tanstack/query/client";
import { bootstrapSyncData } from "@/lib/sync/bootstrap-sync-data";
import { migrate } from "drizzle-orm/op-sqlite/migrator";
import { useEffect, useState } from "react";
import { db, ensureSpatialMetadata, resetLocalDatabase } from "./client";
import { backfillMarkerKinds } from "./backfill-marker-kinds";

interface InitDatabaseProps {
  children?: React.ReactNode;
}

class MigrationBootstrapError extends Error {
  override name = "MigrationBootstrapError";
}

class InitBootstrapError extends Error {
  override name = "InitBootstrapError";
}

let bootstrapPromise: Promise<void> | null = null;

async function runDatabaseBootstrap(): Promise<void> {
  if (process.env.EXPO_PUBLIC_RESET_DATABASE === "1") {
    resetLocalDatabase();
    bootstrapPromise = null;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await migrate(db, migrations);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error(String(err));
      console.error("[InitDatabase] migration failed:", nextError);
      throw new MigrationBootstrapError(nextError.message);
    }

    try {
      await ensureSpatialMetadata();
      await bootstrapSyncData(db);
      await backfillMarkerKinds(db);
      await Promise.all([
        queryClient.prefetchQuery(enrichedRoutingPointsQueryOptions),
        queryClient.prefetchQuery(neighborLinksQueryOptions),
        queryClient.prefetchQuery(landmarkTypesQueryOptions),
        queryClient.prefetchQuery(pendingSyncEventsQueryOptions),
        queryClient.prefetchQuery(pendingSyncCountQueryOptions),
      ]);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error(String(err));
      console.error("[InitDatabase] initialization failed:", nextError);
      throw new InitBootstrapError(nextError.message);
    }
  })().catch((err) => {
    bootstrapPromise = null;
    throw err;
  });

  return bootstrapPromise;
}

export function InitDatabase({ children }: InitDatabaseProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    void runDatabaseBootstrap()
      .then(() => {
        if (!cancelled) {
          setSuccess(true);
          setReady(true);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const nextError = err instanceof Error ? err : new Error(String(err));
        if (nextError instanceof MigrationBootstrapError) {
          setError(nextError);
          return;
        }
        if (nextError instanceof InitBootstrapError) {
          setSuccess(true);
          setInitError(nextError);
          return;
        }
        setError(nextError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    return <LoadingState testID="init-db-migrating" />;
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
    return <LoadingState testID="init-db-loading" />;
  }

  return children;
}
