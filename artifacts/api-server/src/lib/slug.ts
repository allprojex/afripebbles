import { and, eq, ne, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";

/**
 * Admin create/update handlers must never silently overwrite or auto-rename
 * a colliding slug — they check this first and return 409 so the editor can
 * pick a different one.
 */
export async function isSlugTaken(
  table: PgTable,
  slugColumn: PgColumn,
  idColumn: PgColumn,
  slug: string,
  excludeId?: number,
): Promise<boolean> {
  const condition: SQL = excludeId !== undefined ? and(eq(slugColumn, slug), ne(idColumn, excludeId))! : eq(slugColumn, slug);
  const rows = await db.select({ id: idColumn }).from(table).where(condition).limit(1);
  return rows.length > 0;
}
