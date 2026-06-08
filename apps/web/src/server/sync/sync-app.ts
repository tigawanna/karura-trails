import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/client";
import { syncEvents } from "@/lib/drizzle/schema/sync-events-schema";
import { serverEnv } from "@/lib/server-env";
import type {
  SyncEventPayload,
  SyncEventRecord,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "@/types/sync";
import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";

const PUSH_BATCH_LIMIT = 50;
const PULL_BATCH_LIMIT = 100;

function mapRow(row: typeof syncEvents.$inferSelect): SyncEventRecord {
  return {
    id: row.id,
    deviceId: row.deviceId,
    tableName: row.tableName,
    rowId: row.rowId,
    action: row.action as SyncEventRecord["action"],
    payloadJson: row.payloadJson,
    createdAt: row.createdAt,
    verified: row.verified,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
  };
}

function isValidPushPayload(body: unknown): body is SyncPushRequest {
  if (!body || typeof body !== "object") return false;
  const value = body as SyncPushRequest;
  return typeof value.deviceId === "string" && Array.isArray(value.events);
}

function normalizeIncomingEvent(event: SyncEventPayload, deviceId: string) {
  return {
    id: event.id,
    deviceId,
    tableName: event.table,
    rowId: event.rowId,
    action: event.action,
    payloadJson: JSON.stringify(event.payload ?? {}),
    createdAt: event.createdAt,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
  };
}

async function authorizeSyncPush(request: Request): Promise<boolean> {
  if (serverEnv.SYNC_API_SECRET) {
    const headerSecret = request.headers.get("x-sync-secret");
    if (headerSecret === serverEnv.SYNC_API_SECRET) {
      return true;
    }
  }

  const session = await auth.api.getSession({ headers: request.headers });
  return Boolean(session?.user);
}

async function authorizeAdmin(request: Request): Promise<boolean> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.role === "admin";
}

export const syncApp = new Hono()
  .post("/events", async (c) => {
    const authorized = await authorizeSyncPush(c.req.raw);
    if (!authorized) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body: unknown = await c.req.json();
    if (!isValidPushPayload(body)) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    const batch = body.events.slice(0, PUSH_BATCH_LIMIT);
    let accepted = 0;
    let lastAcceptedId: string | null = null;

    for (const event of batch) {
      const row = normalizeIncomingEvent(event, body.deviceId);
      await db.insert(syncEvents).values(row).onConflictDoNothing({ target: syncEvents.id });
      accepted += 1;
      lastAcceptedId = row.id;
    }

    const response: SyncPushResponse = {
      accepted,
      hasMore: body.events.length > PUSH_BATCH_LIMIT,
      lastAcceptedId,
    };

    return c.json(response);
  })
  .get("/events", async (c) => {
    const after = c.req.query("after");
    const limit = Math.min(Number(c.req.query("limit") ?? PULL_BATCH_LIMIT), PULL_BATCH_LIMIT);
    const includeUnverified = c.req.query("includeUnverified") === "true";
    const isAdmin = await authorizeAdmin(c.req.raw);

    const conditions = [];
    if (after) {
      conditions.push(gt(syncEvents.id, after));
    }
    if (!includeUnverified || !isAdmin) {
      conditions.push(eq(syncEvents.verified, true));
    }

    const rows = await db
      .select()
      .from(syncEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(syncEvents.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    const response: SyncPullResponse = {
      events: page.map(mapRow),
      hasMore,
      nextCursor,
    };

    return c.json(response);
  })
  .patch("/events/:id/verify", async (c) => {
    const isAdmin = await authorizeAdmin(c.req.raw);
    if (!isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const eventId = c.req.param("id");
    const verifiedAt = new Date().toISOString();

    await db
      .update(syncEvents)
      .set({
        verified: true,
        verifiedAt,
        verifiedBy: session?.user.id ?? null,
      })
      .where(eq(syncEvents.id, eventId));

    return c.json({ ok: true, id: eventId, verifiedAt });
  });
