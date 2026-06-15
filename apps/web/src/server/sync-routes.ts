import { getAuth } from "@/lib/auth";
import { createDb } from "@/db/d1";
import { syncEvents } from "@/lib/drizzle/schema/sync-events-schema";
import type {
  SyncEventPayload,
  SyncEventRecord,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "@/types/sync";
import { and, asc, count, desc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";

const PUSH_BATCH_LIMIT = 50;
const PULL_BATCH_LIMIT = 100;

function syncServerLog(message: string, details?: Record<string, unknown>) {
  console.log("[sync-server]", message, details ?? "");
}

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

export const syncRoutes = new Hono<{ Bindings: CloudflareBindings }>()
  .post("/events", async (c) => {
    const auth = getAuth();
    const syncSecret = c.env.SYNC_API_SECRET;
    const headerSecret = c.req.header("x-sync-secret");
    const hasSyncSecret = Boolean(syncSecret && headerSecret === syncSecret);

    if (!hasSyncSecret) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        syncServerLog("push unauthorized", { deviceId: null });
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

    const body: unknown = await c.req.json();
    if (!isValidPushPayload(body)) {
      syncServerLog("push rejected", { reason: "invalid payload" });
      return c.json({ error: "Invalid payload" }, 400);
    }

    if (!hasSyncSecret) {
      syncServerLog("push auth", { method: "session" });
    } else {
      syncServerLog("push auth", { method: "x-sync-secret" });
    }

    const db = createDb(c.env.DB);
    const batch = body.events.slice(0, PUSH_BATCH_LIMIT);
    let accepted = 0;
    let lastAcceptedId: string | null = null;

    for (const event of batch) {
      const row = normalizeIncomingEvent(event, body.deviceId);
      await db.insert(syncEvents).values(row).onConflictDoNothing({ target: syncEvents.id });
      accepted += 1;
      lastAcceptedId = row.id;
    }

    syncServerLog("push accepted", {
      deviceId: body.deviceId,
      requested: body.events.length,
      accepted,
      lastAcceptedId,
      hasMore: body.events.length > PUSH_BATCH_LIMIT,
    });

    const response: SyncPushResponse = {
      accepted,
      hasMore: body.events.length > PUSH_BATCH_LIMIT,
      lastAcceptedId,
    };

    return c.json(response);
  })
  .get("/events", async (c) => {
    const auth = getAuth();
    const after = c.req.query("after");
    const limit = Math.min(Number(c.req.query("limit") ?? PULL_BATCH_LIMIT), PULL_BATCH_LIMIT);
    const includeUnverified = c.req.query("includeUnverified") === "true";
    const pendingOnly = c.req.query("pendingOnly") === "true";
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user?.role === "admin";

    if (!session?.user) {
      syncServerLog("pull unauthorized");
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (pendingOnly && !isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const conditions = [];
    if (pendingOnly) {
      conditions.push(eq(syncEvents.verified, false));
    } else {
      if (after) {
        conditions.push(gt(syncEvents.id, after));
      }
      if (!includeUnverified || !isAdmin) {
        conditions.push(eq(syncEvents.verified, true));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const db = createDb(c.env.DB);

    const [batchTotalRow] = await db.select({ total: count() }).from(syncEvents).where(whereClause);
    const batchTotal = batchTotalRow?.total ?? 0;
    const batchPages = batchTotal === 0 ? 0 : Math.ceil(batchTotal / limit);

    const rows = await db
      .select()
      .from(syncEvents)
      .where(whereClause)
      .orderBy(pendingOnly ? desc(syncEvents.id) : asc(syncEvents.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    const remainingCount = hasMore ? Math.max(0, batchTotal - items.length) : 0;

    const response: SyncPullResponse = {
      events: items.map(mapRow),
      hasMore,
      nextCursor,
      page: items.length > 0 ? Math.max(1, Math.ceil((batchTotal - remainingCount) / limit)) : 0,
      perPage: limit,
      totalCount: batchTotal,
      totalPages: batchPages,
      remainingCount,
    };

    syncServerLog("pull", {
      after: after ?? null,
      batchPage: response.page,
      batchPages,
      returned: items.length,
      hasMore,
      remainingCount,
      includeUnverified: includeUnverified && isAdmin,
      pendingOnly,
      userId: session.user.id,
    });

    return c.json(response);
  })
  .patch("/events/:id/verify", async (c) => {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user?.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const eventId = c.req.param("id");
    const verifiedAt = new Date().toISOString();
    const db = createDb(c.env.DB);

    const body = (await c.req.json().catch(() => null)) as {
      latitude?: unknown;
      longitude?: unknown;
      name?: unknown;
    } | null;

    const latitude =
      typeof body?.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null;
    const longitude =
      typeof body?.longitude === "number" && Number.isFinite(body.longitude)
        ? body.longitude
        : null;
    const name = body?.name === null || typeof body?.name === "string" ? body.name : null;

    let payloadJson: string | undefined;
    if (latitude != null || longitude != null || name !== null) {
      const [event] = await db.select().from(syncEvents).where(eq(syncEvents.id, eventId)).limit(1);

      if (!event) {
        return c.json({ error: "Event not found" }, 404);
      }

      const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
      if (latitude != null) {
        payload.latitude = latitude;
      }
      if (longitude != null) {
        payload.longitude = longitude;
      }
      if (name !== null) {
        payload.name = name;
      }
      payload.updatedAt = verifiedAt;
      payloadJson = JSON.stringify(payload);
    }

    await db
      .update(syncEvents)
      .set({
        ...(payloadJson ? { payloadJson } : {}),
        verified: true,
        verifiedAt,
        verifiedBy: session.user.id,
      })
      .where(eq(syncEvents.id, eventId));

    return c.json({ ok: true, id: eventId, verifiedAt });
  });
