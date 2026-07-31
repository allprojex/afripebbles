import { describe, expect, it } from "vitest";
import {
  AdminCreateProductBody,
  AdminCreatePodcastEpisodeBody,
  AdminCreateBlogPostBody,
  AdminCreateCuratedPickBody,
  AdminUpdateSiteSettingsBody,
  AdminUpdateHomepageContentBody,
  AdminUpdateContactEnquiryBody,
} from "@workspace/api-zod";

describe("AdminCreateProductBody validation", () => {
  const valid = { slug: "test-planner", title: "Test Planner", description: "A planner.", price: 12.5, type: "digital" as const };

  it("accepts a minimal valid payload", () => {
    expect(AdminCreateProductBody.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing title", () => {
    const { title: _title, ...rest } = valid;
    expect(AdminCreateProductBody.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid type enum value", () => {
    expect(AdminCreateProductBody.safeParse({ ...valid, type: "not-a-type" }).success).toBe(false);
  });

  it("rejects an invalid availability enum value", () => {
    expect(AdminCreateProductBody.safeParse({ ...valid, availability: "backordered" }).success).toBe(false);
  });

  it("rejects an invalid status enum value", () => {
    expect(AdminCreateProductBody.safeParse({ ...valid, status: "live" }).success).toBe(false);
  });
});

describe("AdminCreatePodcastEpisodeBody validation", () => {
  const valid = { slug: "ep-1", title: "Episode 1", description: "First episode.", episodeNumber: 1 };

  it("accepts a minimal valid payload", () => {
    expect(AdminCreatePodcastEpisodeBody.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing episodeNumber", () => {
    const { episodeNumber: _n, ...rest } = valid;
    expect(AdminCreatePodcastEpisodeBody.safeParse(rest).success).toBe(false);
  });
});

describe("AdminCreateBlogPostBody validation", () => {
  const valid = { title: "Post", slug: "post", excerpt: "Excerpt.", content: "Body.", category: "Faith" };

  it("accepts a minimal valid payload", () => {
    expect(AdminCreateBlogPostBody.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid contentType enum value", () => {
    expect(AdminCreateBlogPostBody.safeParse({ ...valid, contentType: "podcast" }).success).toBe(false);
  });
});

describe("AdminCreateCuratedPickBody validation", () => {
  const valid = { slug: "pick", title: "Pick", description: "Desc.", category: "Beauty", affiliateUrl: "https://example.com", brand: "Brand" };

  it("accepts a minimal valid payload", () => {
    expect(AdminCreateCuratedPickBody.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing affiliateUrl", () => {
    const { affiliateUrl: _url, ...rest } = valid;
    expect(AdminCreateCuratedPickBody.safeParse(rest).success).toBe(false);
  });
});

describe("AdminUpdateSiteSettingsBody validation", () => {
  it("accepts an empty payload (every field optional)", () => {
    expect(AdminUpdateSiteSettingsBody.safeParse({}).success).toBe(true);
  });

  it("rejects a non-array supportedRegions", () => {
    expect(AdminUpdateSiteSettingsBody.safeParse({ supportedRegions: "Ghana" }).success).toBe(false);
  });
});

describe("AdminUpdateHomepageContentBody validation", () => {
  it("accepts an empty payload (every field optional)", () => {
    expect(AdminUpdateHomepageContentBody.safeParse({}).success).toBe(true);
  });

  it("rejects a non-boolean section-visibility flag", () => {
    expect(AdminUpdateHomepageContentBody.safeParse({ showShopSection: "yes" }).success).toBe(false);
  });
});

describe("AdminUpdateContactEnquiryBody (EnquiryUpdateInput) validation", () => {
  it("accepts a valid status", () => {
    expect(AdminUpdateContactEnquiryBody.safeParse({ status: "resolved" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(AdminUpdateContactEnquiryBody.safeParse({ status: "closed" }).success).toBe(false);
  });
});
