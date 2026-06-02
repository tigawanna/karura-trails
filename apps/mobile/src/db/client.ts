import { ANDROID_DATABASE_PATH, IOS_LIBRARY_PATH, open } from "@op-engineering/op-sqlite";
import { Platform } from "react-native";

export const DATABASE_NAME = "karura_trails.db";
export const DATABASE_LOCATION = Platform.OS === "ios" ? IOS_LIBRARY_PATH : ANDROID_DATABASE_PATH;

const opsqliteDb = open({
  name: DATABASE_NAME,
  location: DATABASE_LOCATION,
});

opsqliteDb.loadExtension("libspatialite", "sqlite3_modspatialite_init");

export { opsqliteDb };

export function executeQuerySync<T>(sql: string): T[] {
  const result = opsqliteDb.executeSync(sql);
  return (result.rows ?? []) as T[];
}
