import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, podcastEpisodesTable } from "@workspace/db";
import {
  ListPodcastEpisodesQueryParams,
  ListPodcastEpisodesResponse,
  GetPodcastEpisodeParams,
  GetPodcastEpisodeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/podcast-episodes", async (req, res): Promise<void> => {
  const query = ListPodcastEpisodesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db
    .select()
    .from(podcastEpisodesTable)
    .orderBy(desc(podcastEpisodesTable.publishedAt));

  if (query.data.featured === "true") {
    const episodes = await db
      .select()
      .from(podcastEpisodesTable)
      .where(eq(podcastEpisodesTable.isFeatured, true))
      .orderBy(desc(podcastEpisodesTable.publishedAt));
    const limit = query.data.limit ? Number(query.data.limit) : undefined;
    res.json(ListPodcastEpisodesResponse.parse(limit ? episodes.slice(0, limit) : episodes));
    return;
  }

  const episodes = await dbQuery;
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
    .where(eq(podcastEpisodesTable.id, params.data.id));

  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  res.json(GetPodcastEpisodeResponse.parse(episode));
});

export default router;
