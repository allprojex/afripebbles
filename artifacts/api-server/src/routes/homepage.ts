import { Router, type IRouter } from "express";
import { and, eq, desc, count } from "drizzle-orm";
import { db, productsTable, podcastEpisodesTable, blogPostsTable, curatedPicksTable } from "@workspace/db";
import { GetHomepageSummaryResponse } from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";
import { EMPTY_PRODUCT_CHILDREN } from "../lib/productComposition";

const router: IRouter = Router();

router.get("/homepage-summary", async (_req, res): Promise<void> => {
  const productVisible = isPubliclyVisible(productsTable.status, productsTable.scheduledAt);
  const episodeVisible = isPubliclyVisible(podcastEpisodesTable.status, podcastEpisodesTable.scheduledAt);
  const postVisible = isPubliclyVisible(blogPostsTable.status, blogPostsTable.scheduledAt);
  const pickVisible = isPubliclyVisible(curatedPicksTable.status, curatedPicksTable.scheduledAt);

  const [
    featuredProducts,
    latestEpisodeArr,
    featuredBlogPosts,
    featuredCuratedPicks,
    episodeCountArr,
    postCountArr,
  ] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(and(productVisible, eq(productsTable.isFeatured, true)))
      .limit(4),
    db
      .select()
      .from(podcastEpisodesTable)
      .where(episodeVisible)
      .orderBy(desc(podcastEpisodesTable.publishedAt))
      .limit(1),
    db
      .select()
      .from(blogPostsTable)
      .where(and(postVisible, eq(blogPostsTable.isFeatured, true)))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(3),
    db
      .select()
      .from(curatedPicksTable)
      .where(and(pickVisible, eq(curatedPicksTable.isFeatured, true)))
      .limit(4),
    db.select({ count: count() }).from(podcastEpisodesTable).where(episodeVisible),
    db.select({ count: count() }).from(blogPostsTable).where(postVisible),
  ]);

  const summary = {
    // Homepage cards don't render option/variety/gallery detail — skip the per-row join.
    featuredProducts: featuredProducts.map((p) => ({ ...p, ...EMPTY_PRODUCT_CHILDREN })),
    latestEpisode: latestEpisodeArr[0] ?? null,
    featuredBlogPosts,
    featuredCuratedPicks,
    totalEpisodes: episodeCountArr[0]?.count ?? 0,
    totalBlogPosts: postCountArr[0]?.count ?? 0,
  };

  res.json(GetHomepageSummaryResponse.parse(summary));
});

export default router;
