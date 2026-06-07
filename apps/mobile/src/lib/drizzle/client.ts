import * as schema from "@/lib/drizzle/schema";
import {
  ANDROID_DATABASE_PATH,
  IOS_LIBRARY_PATH,
  open,
  type Scalar,
} from "@op-engineering/op-sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/op-sqlite";
import { Platform } from "react-native";

import { discardRegisteredGeometryColumns } from "./spatial-setup";

export const DATABASE_NAME = "notes.db";
export const DATABASE_BACKUP_NAME = "notes-backup.db";
export const DATABASE_LOCATION = Platform.OS === "ios" ? IOS_LIBRARY_PATH : ANDROID_DATABASE_PATH;

export const opsqliteDb = open({
  name: DATABASE_NAME,
  location: DATABASE_LOCATION,
});

const path = "libspatialite";
const spatialiteEntryPoint = "sqlite3_modspatialite_init";

opsqliteDb.loadExtension(path, spatialiteEntryPoint);

export const db = drizzle(opsqliteDb, {
  logger: true,
  schema: schema,
});

export type DrizzleDB = typeof db;

let spatialMetadataReady = false;

export function resetLocalDatabase(): void {
  spatialMetadataReady = false;
  opsqliteDb.delete();
}

export async function ensureSpatialMetadata(): Promise<void> {
  if (spatialMetadataReady) {
    return;
  }
  await db.run(sql`SELECT InitSpatialMetaData(1)`);
  discardRegisteredGeometryColumns(opsqliteDb);
  spatialMetadataReady = true;
}

export function executeQuerySync<T extends object>(query: string, params?: Scalar[]): T[] {
  const result = params ? opsqliteDb.executeSync(query, params) : opsqliteDb.executeSync(query);
  return (result.rows ?? []) as T[];
}
