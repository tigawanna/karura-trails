import { drizzle } from "drizzle-orm/libsql/node";
import { serverEnv } from "../server-env";
import * as schema from "./schema";

export const db = drizzle({
  connection: {
    url: serverEnv.DATABASE_URL,
    authToken: serverEnv.DATABASE_AUTH_TOKEN,
  },
  schema,
});
