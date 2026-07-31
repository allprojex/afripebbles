import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, podcastEpisodesTable } from "@workspace/db";
import {
  ListPodcastEpisodesQueryParams,
  ListPodcastEpisodesResponse,
  GetPodcastEpisodeParams,
  GetPodcastEpisodeResponse,
} from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";

const router: IRouter = Router();

router.get("/podcast-episodes", async (req, res): Promise<void> => {
  const query = ListPodcastEpisodesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [isPubliclyVisible(podcastEpisodesTable.status, podcastEpisodesTable.scheduledAt)];
  if (query.data.featured === "true") {
    conditions.push(eq(podcastEpisodesTable.isFeatured, true));
  }

  const episodes = await db
    .select()
    .from(podcastEpisodesTable)
    .where(and(...conditions))
    .orderBy(desc(podcastEpisodesTable.publishedAt));

  const limit = query.data.limit ? Number(query.data.limit) : undefined;
  res.json(ListPodcastEpisodesResponse.parse(limit ? episodes.slice(0, limit) : episodes));
});

router.get("/podcast-episodes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPodcastEpisodeParams.safeParse({ id: parseFloat(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [episode] = await db
    .select()
    .from(podcastEpisodesTable)
    .where(
      and(
        eq(podcastEpisodesTable.id, params.data.id),
        isPubliclyVisible(podcastEpisodesTable.status, podcastEpisodesTable.scheduledAt),
      ),
    );

  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  res.json(GetPodcastEpisodeResponse.parse(episode));
});

export default router;
