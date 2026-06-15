import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { migrate } from "@proj-airi/drizzle-orm-browser-migrator/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import migrations from "virtual:drizzle-migrations.sql";
import * as schema from "@/lib/pglite/schema";

export const pgliteClient = new PGlite({
  dataDir: "idb://karura-map-data",
  extensions: { postgis },
});

export const db = drizzle({ client: pgliteClient, schema });

export type PgliteDb = typeof db;

type BundledMigration = {
  idx: number;
  when: number;
  tag: string;
  hash: string;
  sql: string[];
};

type PgliteGlobal = typeof globalThis & {
  __karuraPgliteInitPromise?: Promise<void>;
};

const pgliteGlobal = globalThis as PgliteGlobal;

const pgliteReadyListeners = new Set<() => void>();

export function subscribePgliteReady(listener: () => void): () => void {
  pgliteReadyListeners.add(listener);
  return () => {
    pgliteReadyListeners.delete(listener);
  };
}

function notifyPgliteReady() {
  for (const listener of pgliteReadyListeners) {
    listener();
  }
}

let initPromise: Promise<void> | null = null;

export function initPgliteDb(): Promise<void> {
  if (!initPromise) {
    initPromise = pgliteGlobal.__karuraPgliteInitPromise ?? null;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await pgliteClient.waitReady;
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
      await migrate(db, migrations as BundledMigration[]);
      notifyPgliteReady();
    })();
    pgliteGlobal.__karuraPgliteInitPromise = initPromise;
  }

  return initPromise;
}
