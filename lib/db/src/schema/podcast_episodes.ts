import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const podcastEpisodesTable = pgTable("podcast_episodes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  season: integer("season"),
  audioUrl: text("audio_url"),
  /** YouTube (or other platform) watch URL — the podcast publishes on YouTube. */
  externalUrl: text("external_url"),
  guestName: text("guest_name"),
  showNotesUrl: text("show_notes_url"),
  transcriptUrl: text("transcript_url"),
  coverImageUrl: text("cover_image_url"),
  durationSeconds: integer("duration_seconds"),
  isFeatured: boolean("is_featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
});

export const insertPodcastEpisodeSchema = createInsertSchema(podcastEpisodesTable).omit({ id: true });
export type InsertPodcastEpisode = z.infer<typeof insertPodcastEpisodeSchema>;
export type PodcastEpisode = typeof podcastEpisodesTable.$inferSelect;
