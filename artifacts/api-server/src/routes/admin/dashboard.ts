import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  db,
  productsTable,
  podcastEpisodesTable,
  blogPostsTable,
  curatedPicksTable,
  newsletterSubscriptionsTable,
  contactEnquiriesTable,
  collaborationEnquiriesTable,
} from "@workspace/db";
import { GetAdminDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function countBreakdown(table: PgTable, statusColumn: PgColumn) {
  const [[totalRow], [publishedRow], [draftRow]] = await Promise.all([
    db.select({ count: count() }).from(table),
    db.select({ count: count() }).from(table).where(eq(statusColumn, "published")),
    db.select({ count: count() }).from(table).where(eq(statusColumn, "draft")),
  ]);
  return {
    total: totalRow?.count ?? 0,
    published: publishedRow?.count ?? 0,
    draft: draftRow?.count ?? 0,
  };
}

interface RecentRow {
  contentType: "product" | "podcast_episode" | "blog_post" | "curated_pick";
  id: number;
  title: string;
  status: string;
  updatedAt: Date;
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [
    products,
    preorderProductsArr,
    podcastEpisodes,
    recommendations,
    articles,
    newsletterSubscribersArr,
    contactEnquiriesArr,
    collaborationEnquiriesArr,
    productEnquiriesArr,
    recentProducts,
    recentEpisodes,
    recentPosts,
    recentPicks,
  ] = await Promise.all([
    countBreakdown(productsTable, productsTable.status),
    db.select({ count: count() }).from(productsTable).where(eq(productsTable.availability, "preorder")),
    countBreakdown(podcastEpisodesTable, podcastEpisodesTable.status),
    countBreakdown(curatedPicksTable, curatedPicksTable.status),
    countBreakdown(blogPostsTable, blogPostsTable.status),
    db.select({ count: count() }).from(newsletterSubscriptionsTable),
    db.select({ count: count() }).from(contactEnquiriesTable),
    db.select({ count: count() }).from(collaborationEnquiriesTable),
    db.select({ count: count() }).from(contactEnquiriesTable).where(eq(contactEnquiriesTable.inquiryType, "product")),
    db
      .select({ id: productsTable.id, title: productsTable.title, status: productsTable.status, updatedAt: productsTable.updatedAt })
      .from(productsTable)
      .orderBy(desc(productsTable.updatedAt))
      .limit(5),
    db
      .select({
        id: podcastEpisodesTable.id,
        title: podcastEpisodesTable.title,
        status: podcastEpisodesTable.status,
        updatedAt: podcastEpisodesTable.updatedAt,
      })
      .from(podcastEpisodesTable)
      .orderBy(desc(podcastEpisodesTable.updatedAt))
      .limit(5),
    db
      .select({ id: blogPostsTable.id, title: blogPostsTable.title, status: blogPostsTable.status, updatedAt: blogPostsTable.updatedAt })
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.updatedAt))
      .limit(5),
    db
      .select({
        id: curatedPicksTable.id,
        title: curatedPicksTable.title,
        status: curatedPicksTable.status,
        updatedAt: curatedPicksTable.updatedAt,
      })
      .from(curatedPicksTable)
      .orderBy(desc(curatedPicksTable.updatedAt))
      .limit(5),
  ]);

  const recentlyUpdated: RecentRow[] = [
    ...recentProducts.map((r) => ({ ...r, contentType: "product" as const })),
    ...recentEpisodes.map((r) => ({ ...r, contentType: "podcast_episode" as const })),
    ...recentPosts.map((r) => ({ ...r, contentType: "blog_post" as const })),
    ...recentPicks.map((r) => ({ ...r, contentType: "curated_pick" as const })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  res.json(
    GetAdminDashboardResponse.parse({
      products,
      preorderProducts: preorderProductsArr[0]?.count ?? 0,
      podcastEpisodes,
      recommendations,
      articles,
      newsletterSubscribers: newsletterSubscribersArr[0]?.count ?? 0,
      contactEnquiries: contactEnquiriesArr[0]?.count ?? 0,
      collaborationEnquiries: collaborationEnquiriesArr[0]?.count ?? 0,
      productEnquiries: productEnquiriesArr[0]?.count ?? 0,
      recentlyUpdated,
    }),
  );
});

export default router;
