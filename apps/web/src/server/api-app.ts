import { Hono } from "hono";

export const apiApp = new Hono()
  .basePath("/api")
  .get("/health", (c) =>
    c.json({
      ok: true,
      service: "karura-trails",
    }),
  )
  .get("/trails", (c) =>
    c.json({
      trails: [],
    }),
  );
