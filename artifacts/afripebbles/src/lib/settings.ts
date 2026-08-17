import type { SiteSettings, HomepageContent } from "@workspace/api-client-react";
import { siteConfig, type SocialLink } from "@/content/site";

/**
 * Merges admin-saved site settings over the verified defaults in
 * src/content/site.ts. A DB value wins only when it's actually set —
 * unset/null fields fall back to the confirmed static copy, so the site
 * never publishes a blank or invented value.
 */
export function resolveSocialLinks(settings: SiteSettings | null | undefined): SocialLink[] {
  const merged: Record<"Instagram" | "Facebook" | "YouTube" | "TikTok", string | undefined> = {
    Instagram: settings?.instagramUrl || siteConfig.social.instagram,
    Facebook: settings?.facebookUrl || siteConfig.social.facebook,
    YouTube: settings?.youtubeUrl || siteConfig.social.youtube,
    TikTok: settings?.tiktokUrl || siteConfig.social.tiktok,
  };

  return (Object.entries(merged) as [SocialLink["label"], string | undefined][])
    .filter(([, href]) => Boolean(href))
    .map(([label, href]) => ({ label, href: href as string }));
}

export interface ResolvedSiteSettings {
  brandName: string;
  tagline: string | null;
  contactEmail: string | null;
  supportEmail: string | null;
  collaborationEmail: string | null;
  whatsappNumber: string | null;
  socialLinks: SocialLink[];
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  canonicalUrl: string;
  socialShareImageUrl: string | null;
  footerText: string | null;
  newsletterWording: string | null;
  affiliateDisclosure: string;
  shopStatus: string | null;
  preorderNotice: string | null;
  shippingNotice: string | null;
  privacyContactInfo: string | null;
}

export function resolveSiteSettings(settings: SiteSettings | null | undefined): ResolvedSiteSettings {
  return {
    brandName: settings?.brandName || siteConfig.brand.name,
    tagline: settings?.tagline ?? siteConfig.brand.tagline,
    contactEmail: settings?.contactEmail ?? siteConfig.contact.email,
    supportEmail: settings?.supportEmail ?? null,
    collaborationEmail: settings?.collaborationEmail ?? null,
    whatsappNumber: settings?.whatsappNumber ?? siteConfig.contact.whatsapp,
    socialLinks: resolveSocialLinks(settings),
    seoDefaultTitle: settings?.seoDefaultTitle || siteConfig.seo.defaultTitle,
    seoDefaultDescription: settings?.seoDefaultDescription || siteConfig.seo.defaultDescription,
    canonicalUrl: settings?.canonicalUrl || siteConfig.seo.plannedDomain,
    socialShareImageUrl: settings?.socialShareImageUrl ?? null,
    footerText: settings?.footerText ?? null,
    newsletterWording: settings?.newsletterWording ?? null,
    affiliateDisclosure: settings?.affiliateDisclosure || siteConfig.affiliateDisclosure,
    shopStatus: settings?.shopStatus ?? null,
    preorderNotice: settings?.preorderNotice ?? null,
    shippingNotice: settings?.shippingNotice ?? null,
    privacyContactInfo: settings?.privacyContactInfo ?? null,
  };
}

export interface ResolvedHomepageContent {
  heroHeading: string | null;
  heroSubheading: string | null;
  heroImageUrl: string | null;
  primaryCtaLabel: string | null;
  primaryCtaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  showPodcastSection: boolean;
  showShopSection: boolean;
  showJournalSection: boolean;
  showRecommendationsSection: boolean;
  showCollaborateSection: boolean;
  showTestimonialsSection: boolean;
  showNewsletterSection: boolean;
  newsletterHeading: string | null;
  newsletterBody: string | null;
  collaborateHeading: string | null;
  collaborateBody: string | null;
}

export function resolveHomepageContent(content: HomepageContent | null | undefined): ResolvedHomepageContent {
  return {
    heroHeading: content?.heroHeading ?? null,
    heroSubheading: content?.heroSubheading ?? null,
    heroImageUrl: content?.heroImageUrl ?? null,
    primaryCtaLabel: content?.primaryCtaLabel ?? null,
    primaryCtaHref: content?.primaryCtaHref ?? null,
    secondaryCtaLabel: content?.secondaryCtaLabel ?? null,
    secondaryCtaHref: content?.secondaryCtaHref ?? null,
    showPodcastSection: content?.showPodcastSection ?? true,
    showShopSection: content?.showShopSection ?? true,
    showJournalSection: content?.showJournalSection ?? true,
    showRecommendationsSection: content?.showRecommendationsSection ?? true,
    showCollaborateSection: content?.showCollaborateSection ?? true,
    showTestimonialsSection: content?.showTestimonialsSection ?? true,
    showNewsletterSection: content?.showNewsletterSection ?? true,
    newsletterHeading: content?.newsletterHeading ?? null,
    newsletterBody: content?.newsletterBody ?? null,
    collaborateHeading: content?.collaborateHeading ?? null,
    collaborateBody: content?.collaborateBody ?? null,
  };
}
