import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, podcastEpisodesTable } from "@workspace/db";
import {
  AdminListPodcastEpisodesQueryParams,
  AdminListPodcastEpisodesResponse,
  AdminCreatePodcastEpisodeBody,
  AdminCreatePodcastEpisodeResponse,
  AdminGetPodcastEpisodeParams,
  AdminGetPodcastEpisodeResponse,
  AdminUpdatePodcastEpisodeParams,
  AdminUpdatePodcastEpisodeBody,
  AdminUpdatePodcastEpisodeResponse,
  AdminDeletePodcastEpisodeParams,
} from "@workspace/api-zod";
import { isSlugTaken } from "../../lib/slug";
import { collectImageUrls, cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/podcast-episodes", async (req, res): Promise<void> => {
  const query = AdminListPodcastEpisodesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(podcastEpisodesTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      or(ilike(podcastEpisodesTable.title, `%${query.data.search}%`), ilike(podcastEpisodesTable.slug, `%${query.data.search}%`)),
    );
  }

  const episodes = await db
    .select()
    .from(podcastEpisodesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(podcastEpisodesTable.updatedAt));

  res.json(AdminListPodcastEpisodesResponse.parse(episodes));
});

router.post("/podcast-episodes", async (req, res): Promise<void> => {
  const body = AdminCreatePodcastEpisodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (await isSlugTaken(podcastEpisodesTable, podcastEpisodesTable.slug, podcastEpisodesTable.id, body.data.slug)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another episode.` });
    return;
  }

  const [episode] = await db.insert(podcastEpisodesTable).values(body.data).returning();
  res.status(201).json(AdminCreatePodcastEpisodeResponse.parse(episode));
});

router.get("/podcast-episodes/:id", async (req, res): Promise<void> => {
  const params = AdminGetPodcastEpisodeParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [episode] = await db.select().from(podcastEpisodesTable).where(eq(podcastEpisodesTable.id, params.data.id));
  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  res.json(AdminGetPodcastEpisodeResponse.parse(episode));
});

router.put("/podcast-episodes/:id", async (req, res): Promise<void> => {
  const params = AdminUpdatePodcastEpisodeParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdatePodcastEpisodeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(podcastEpisodesTable).where(eq(podcastEpisodesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  if (await isSlugTaken(podcastEpisodesTable, podcastEpisodesTable.slug, podcastEpisodesTable.id, body.data.slug, params.data.id)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another episode.` });
    return;
  }

  const [episode] = await db
    .update(podcastEpisodesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(podcastEpisodesTable.id, params.data.id))
    .returning();

  if (!episode) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  if (existing.coverImageUrl && existing.coverImageUrl !== episode.coverImageUrl) {
    try {
      const cleanup = await cleanupOrphanedImages([existing.coverImageUrl]);
      if (cleanup.failed.length > 0) {
        logger.warn(
          { episodeId: episode.id, failed: cleanup.failed.length },
          "podcast episode update: replaced cover image could not be removed from storage",
        );
      }
    } catch (err) {
      logger.warn(
        { episodeId: episode.id, err: err instanceof Error ? err.message : String(err) },
        "podcast episode update: image cleanup threw",
      );
    }
  }

  res.json(AdminUpdatePodcastEpisodeResponse.parse(episode));
});

router.delete("/podcast-episodes/:id", async (req, res): Promise<void> => {
  const params = AdminDeletePodcastEpisodeParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(podcastEpisodesTable).where(eq(podcastEpisodesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  const [deleted] = await db
    .delete(podcastEpisodesTable)
    .where(eq(podcastEpisodesTable.id, params.data.id))
    .returning({ id: podcastEpisodesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Episode not found" });
    return;
  }

  try {
    const cleanup = await cleanupOrphanedImages(collectImageUrls(existing.coverImageUrl));
    if (cleanup.failed.length > 0) {
      logger.warn({ episodeId: deleted.id, failed: cleanup.failed.length }, "podcast episode delete: cover image could not be removed from storage");
    }
  } catch (err) {
    logger.warn({ episodeId: deleted.id, err: err instanceof Error ? err.message : String(err) }, "podcast episode delete: image cleanup threw");
  }

  res.status(204).send();
});

export default router;
