import { open, type DB, type Scalar } from "@op-engineering/op-sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema";

const DB_NAME = "karura_trails.db";

let _opsqliteDb: DB | null = null;

function getOpsqliteDb(): DB {
  if (!_opsqliteDb) {
    _opsqliteDb = open({ name: DB_NAME });
    _opsqliteDb.loadExtension("libspatialite", "sqlite3_modspatialite_init");
  }
  return _opsqliteDb;
}

export function getDb(): DB {
  return getOpsqliteDb();
}

export function executeQuerySync<T>(sql: string): T[] {
  const rawDb = getOpsqliteDb();
  const result = rawDb.executeSync(sql);
  return result.rows as T[];
}

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const opsqlite = getOpsqliteDb();
    try {
      const result = await opsqlite.execute(sql, params as Scalar[]);

      if (method === "run") {
        return { rows: [] };
      }

      return { rows: result.rows.map((row) => Object.values(row)) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database query failed";
      throw new Error(`[drizzle] ${message}\nSQL: ${sql}`);
    }
  },
  { schema },
);
