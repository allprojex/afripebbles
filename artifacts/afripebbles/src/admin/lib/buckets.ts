export const STORAGE_BUCKETS = ["product-images", "podcast-covers", "article-images", "recommendation-images", "branding"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];
