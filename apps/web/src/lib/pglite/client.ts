import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "@/lib/pglite/schema";

export type PgliteDb = PgliteDatabase<typeof schema>;
