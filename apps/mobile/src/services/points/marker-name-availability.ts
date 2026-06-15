import { and, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/drizzle/client";
import { points } from "@/lib/drizzle/schema";

export async function assertMarkerNameIsAvailable(
  name: string | null,
  excludePointId?: number,
): Promise<void> {
  const trimmed = name?.trim();
  if (!trimmed) {
    return;
  }

  const normalized = trimmed.toLowerCase();
  const nameMatches = sql`trim(coalesce(${points.name}, '')) != '' AND lower(trim(${points.name})) = ${normalized}`;
  const refMatches = sql`trim(coalesce(${points.ref}, '')) != '' AND lower(trim(${points.ref})) = ${normalized}`;

  const filters = [or(nameMatches, refMatches)];
  if (excludePointId != null) {
    filters.push(ne(points.id, excludePointId));
  }

  const [conflict] = await db
    .select({ id: points.id, name: points.name, ref: points.ref })
    .from(points)
    .where(and(...filters))
    .limit(1);

  if (conflict) {
    const label = conflict.ref?.trim() || conflict.name?.trim() || `#${conflict.id}`;
    throw new Error(`A marker named "${trimmed}" already exists (${label}).`);
  }
}
