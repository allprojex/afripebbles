import { and, eq, lte, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Public list/detail queries must only ever return published content, or
 * scheduled content whose scheduledAt has passed. Draft/archived content
 * (and scheduled content that isn't due yet) never reaches a public route.
 */
export function isPubliclyVisible(statusColumn: PgColumn, scheduledAtColumn: PgColumn): SQL {
  return or(
    eq(statusColumn, "published"),
    and(eq(statusColumn, "scheduled"), lte(scheduledAtColumn, new Date())),
  )!;
}
