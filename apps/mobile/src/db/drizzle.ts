import { drizzle } from "drizzle-orm/op-sqlite";
import { opsqliteDb } from "./client";
import * as schema from "./schema";

export const db = drizzle(opsqliteDb, { schema });
