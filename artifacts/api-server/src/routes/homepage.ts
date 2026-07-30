import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, productsTable, podcastEpisodesTable, blogPostsTable, curatedPicksTable } from "@workspace/db";
import { GetHomepageSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/homepage-summary", async (_req, res): Promise<void> => {
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
      .where(eq(productsTable.isFeatured, true))
      .limit(4),
    db
      .select()
      .from(podcastEpisodesTable)
      .orderBy(desc(podcastEpisodesTable.publishedAt))
      .limit(1),
    db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.isFeatured, true))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(3),
    db
      .select()
      .from(curatedPicksTable)
      .where(eq(curatedPicksTable.isFeatured, true))
      .limit(4),
    db.select({ count: count() }).from(podcastEpisodesTable),
    db.select({ count: count() }).from(blogPostsTable),
  ]);

  const summary = {
    featuredProducts,
    latestEpisode: latestEpisodeArr[0] ?? null,
    featuredBlogPosts,
    featuredCuratedPicks,
    totalEpisodes: episodeCountArr[0]?.count ?? 0,
    totalBlogPosts: postCountArr[0]?.count ?? 0,
  };

  res.json(GetHomepageSummaryResponse.parse(summary));
});

export default router;
