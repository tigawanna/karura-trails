import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { migrate } from "@proj-airi/drizzle-orm-browser-migrator/pglite";
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

let initPromise: Promise<void> | null = null;

export function initPgliteDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pgliteClient.waitReady;
      await migrate(db, migrations as BundledMigration[]);
    })();
  }
  return initPromise;
}
