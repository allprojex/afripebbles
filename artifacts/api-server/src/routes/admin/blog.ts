import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  AdminListBlogPostsQueryParams,
  AdminListBlogPostsResponse,
  AdminCreateBlogPostBody,
  AdminCreateBlogPostResponse,
  AdminGetBlogPostParams,
  AdminGetBlogPostResponse,
  AdminUpdateBlogPostParams,
  AdminUpdateBlogPostBody,
  AdminUpdateBlogPostResponse,
  AdminDeleteBlogPostParams,
} from "@workspace/api-zod";
import { isSlugTaken } from "../../lib/slug";
import { collectImageUrls, cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/blog-posts", async (req, res): Promise<void> => {
  const query = AdminListBlogPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(blogPostsTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(or(ilike(blogPostsTable.title, `%${query.data.search}%`), ilike(blogPostsTable.slug, `%${query.data.search}%`)));
  }

  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(blogPostsTable.updatedAt));

  res.json(AdminListBlogPostsResponse.parse(posts));
});

router.post("/blog-posts", async (req, res): Promise<void> => {
  const body = AdminCreateBlogPostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (await isSlugTaken(blogPostsTable, blogPostsTable.slug, blogPostsTable.id, body.data.slug)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another post.` });
    return;
  }

  const [post] = await db.insert(blogPostsTable).values(body.data).returning();
  res.status(201).json(AdminCreateBlogPostResponse.parse(post));
});

router.get("/blog-posts/:id", async (req, res): Promise<void> => {
  const params = AdminGetBlogPostParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(AdminGetBlogPostResponse.parse(post));
});

router.put("/blog-posts/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateBlogPostParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateBlogPostBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (await isSlugTaken(blogPostsTable, blogPostsTable.slug, blogPostsTable.id, body.data.slug, params.data.id)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another post.` });
    return;
  }

  const [post] = await db
    .update(blogPostsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (existing.coverImageUrl && existing.coverImageUrl !== post.coverImageUrl) {
    try {
      const cleanup = await cleanupOrphanedImages([existing.coverImageUrl]);
      if (cleanup.failed.length > 0) {
        logger.warn({ postId: post.id, failed: cleanup.failed.length }, "blog post update: replaced cover image could not be removed from storage");
      }
    } catch (err) {
      logger.warn({ postId: post.id, err: err instanceof Error ? err.message : String(err) }, "blog post update: image cleanup threw");
    }
  }

  res.json(AdminUpdateBlogPostResponse.parse(post));
});

router.delete("/blog-posts/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteBlogPostParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [deleted] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, params.data.id)).returning({ id: blogPostsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  try {
    const cleanup = await cleanupOrphanedImages(collectImageUrls(existing.coverImageUrl));
    if (cleanup.failed.length > 0) {
      logger.warn({ postId: deleted.id, failed: cleanup.failed.length }, "blog post delete: cover image could not be removed from storage");
    }
  } catch (err) {
    logger.warn({ postId: deleted.id, err: err instanceof Error ? err.message : String(err) }, "blog post delete: image cleanup threw");
  }

  res.status(204).send();
});

export default router;
