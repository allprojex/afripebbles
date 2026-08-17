export const STORAGE_BUCKETS = [
  "product-images",
  "podcast-covers",
  "article-images",
  "recommendation-images",
  "branding",
  "ugc-media",
  "testimonial-images",
] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];
