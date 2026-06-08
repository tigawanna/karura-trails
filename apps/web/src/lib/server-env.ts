import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().default(""),
  BETTER_AUTH_SECRET: z.string().min(32),
  FRONTEND_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SYNC_API_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const formattedErrors = result.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const serverEnv = result.data;
