import { describe, expect, it } from "vitest";
import { resolveSiteSettings, resolveHomepageContent } from "./settings";
import { siteConfig } from "@/content/site";
import type { SiteSettings, HomepageContent } from "@workspace/api-client-react";

function fakeSettings(overrides: Partial<SiteSettings>): SiteSettings {
  return {
    id: 1,
    brandName: null,
    tagline: null,
    contactEmail: null,
    supportEmail: null,
    collaborationEmail: null,
    whatsappNumber: null,
    instagramUrl: null,
    facebookUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    seoDefaultTitle: null,
    seoDefaultDescription: null,
    canonicalUrl: null,
    socialShareImageUrl: null,
    businessCountry: null,
    supportedRegions: [],
    defaultCurrency: null,
    newsletterWording: null,
    footerText: null,
    podcastLaunchStatus: null,
    shopStatus: null,
    preorderNotice: null,
    shippingNotice: null,
    affiliateDisclosure: null,
    privacyContactInfo: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("resolveSiteSettings", () => {
  it("falls back to the verified static defaults when nothing is saved", () => {
    const resolved = resolveSiteSettings(null);
    expect(resolved.brandName).toBe(siteConfig.brand.name);
    expect(resolved.seoDefaultTitle).toBe(siteConfig.seo.defaultTitle);
    expect(resolved.affiliateDisclosure).toBe(siteConfig.affiliateDisclosure);
    expect(resolved.socialLinks).toEqual([]);
  });

  it("prefers an admin-saved value over the static default", () => {
    const resolved = resolveSiteSettings(fakeSettings({ brandName: "Custom Brand" }));
    expect(resolved.brandName).toBe("Custom Brand");
  });

  it("only shows a social icon once its URL is actually saved", () => {
    const withNone = resolveSiteSettings(fakeSettings({}));
    expect(withNone.socialLinks).toEqual([]);

    const withInstagram = resolveSiteSettings(fakeSettings({ instagramUrl: "https://instagram.com/afripebbles" }));
    expect(withInstagram.socialLinks).toEqual([{ label: "Instagram", href: "https://instagram.com/afripebbles" }]);
  });

  it("never fabricates a contact email that hasn't been confirmed", () => {
    const resolved = resolveSiteSettings(null);
    expect(resolved.contactEmail).toBeNull();
  });
});

describe("resolveHomepageContent", () => {
  it("defaults every section to visible and every override to unset", () => {
    const resolved = resolveHomepageContent(null);
    expect(resolved.showShopSection).toBe(true);
    expect(resolved.showPodcastSection).toBe(true);
    expect(resolved.heroHeading).toBeNull();
  });

  it("respects an explicit false to hide a section", () => {
    const content: HomepageContent = {
      id: 1,
      heroHeading: null,
      heroSubheading: null,
      heroImageUrl: null,
      primaryCtaLabel: null,
      primaryCtaHref: null,
      secondaryCtaLabel: null,
      secondaryCtaHref: null,
      showPodcastSection: true,
      showShopSection: false,
      showJournalSection: true,
      showRecommendationsSection: true,
      showCollaborateSection: true,
      showNewsletterSection: true,
      newsletterHeading: null,
      newsletterBody: null,
      collaborateHeading: null,
      collaborateBody: null,
      updatedAt: new Date().toISOString(),
    };
    expect(resolveHomepageContent(content).showShopSection).toBe(false);
  });
});
