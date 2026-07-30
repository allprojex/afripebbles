import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  ListBlogPostsQueryParams,
  ListBlogPostsResponse,
  GetBlogPostParams,
  GetBlogPostResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blog-posts", async (req, res): Promise<void> => {
  const query = ListBlogPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.category) {
    conditions.push(eq(blogPostsTable.category, query.data.category));
  }
  if (query.data.featured === "true") {
    conditions.push(eq(blogPostsTable.isFeatured, true));
  }

  const posts =
    conditions.length > 0
      ? await db
          .select()
          .from(blogPostsTable)
          .where(and(...conditions))
          .orderBy(desc(blogPostsTable.publishedAt))
      : await db
          .select()
          .from(blogPostsTable)
          .orderBy(desc(blogPostsTable.publishedAt));

  const limit = query.data.limit ? Number(query.data.limit) : undefined;
  res.json(ListBlogPostsResponse.parse(limit ? posts.slice(0, limit) : posts));
});

router.get("/blog-posts/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;
  const params = GetBlogPostParams.safeParse({ slug: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.slug, params.data.slug));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(GetBlogPostResponse.parse(post));
});

export default router;
