import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "./drizzle/client";
import * as authSchema from "./drizzle/schema/auth-schema";
import { user as userTable } from "./drizzle/schema/auth-schema";
import { serverEnv } from "./server-env";

const googleConfigured =
  Boolean(serverEnv.GOOGLE_CLIENT_ID) && Boolean(serverEnv.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: serverEnv.FRONTEND_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [serverEnv.FRONTEND_URL],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: serverEnv.GOOGLE_CLIENT_ID!,
          clientSecret: serverEnv.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  databaseHooks: serverEnv.ADMIN_EMAIL
    ? {
        user: {
          create: {
            after: async (createdUser) => {
              if (createdUser.email === serverEnv.ADMIN_EMAIL) {
                await db
                  .update(userTable)
                  .set({ role: "admin" })
                  .where(eq(userTable.id, createdUser.id));
              }
            },
          },
        },
      }
    : undefined,
  plugins: [admin(), tanstackStartCookies()],
});
