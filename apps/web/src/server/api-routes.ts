import { createAuth } from "@/server/create-auth";
import { syncRoutes } from "@/server/sync-routes";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const apiRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .use(
    "*",
    cors({
      origin: (origin, c) => {
        const raw = String(c.env.CORS_ORIGINS ?? c.env.BETTER_AUTH_URL ?? "http://localhost:3050");
        const allowed = raw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        if (!origin) return allowed[0];
        return allowed.includes(origin) ? origin : allowed[0];
      },
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-sync-secret"],
      maxAge: 86400,
    }),
  )
  .all("/auth/*", async (c) => {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
  })
  .get("/health", (c) =>
    c.json({
      ok: true,
      service: "karura-trails",
    }),
  )
  .route("/sync", syncRoutes);

export const honoApp = new Hono<{ Bindings: CloudflareBindings }>().route("/api", apiRoutes);

export type HonoAppType = typeof honoApp;
