import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const podcastEpisodesTable = pgTable("podcast_episodes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  season: integer("season"),
  audioUrl: text("audio_url"),
  /** YouTube (or other platform) watch URL — the podcast publishes on YouTube. */
  externalUrl: text("external_url"),
  /** YouTube video id used for embedding, distinct from the full watch URL above. */
  youtubeVideoId: text("youtube_video_id"),
  guestName: text("guest_name"),
  showNotesUrl: text("show_notes_url"),
  showNotes: text("show_notes"),
  transcriptUrl: text("transcript_url"),
  transcript: text("transcript"),
  coverImageUrl: text("cover_image_url"),
  durationSeconds: integer("duration_seconds"),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
});

export const insertPodcastEpisodeSchema = createInsertSchema(podcastEpisodesTable).omit({ id: true, updatedAt: true });
export type InsertPodcastEpisode = z.infer<typeof insertPodcastEpisodeSchema>;
export type PodcastEpisode = typeof podcastEpisodesTable.$inferSelect;
