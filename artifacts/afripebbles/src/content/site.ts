/**
 * Central brand & site configuration.
 *
 * Source of truth: the completed AfriPebbles client questionnaire.
 * Every string here is either a direct/paraphrased questionnaire answer,
 * or explicitly typed as unconfirmed (`null`) when the client has not
 * decided or provided the value yet. Pages must not hardcode brand facts —
 * import them from here so there is exactly one place to correct or confirm
 * a value later.
 */

export interface SocialLink {
  label: string;
  href: string;
}

export interface NavLink {
  href: string;
  label: string;
}

/** A social platform is only rendered once a real URL is configured. */
type SocialConfig = Partial<Record<"instagram" | "tiktok" | "youtube" | "facebook", string>>;

export const siteConfig = {
  brand: {
    name: "AfriPebbles",
    /**
     * The client had three draft tagline options and had not chosen one at
     * the time of writing. Rather than pick on their behalf, we use the
     * confirmed one-sentence description as supporting copy and leave the
     * tagline unset. Set this once the client confirms a choice.
     */
    tagline: null as string | null,
    oneLineDescription:
      "A faith-based lifestyle brand for women — a home for content, digital tools, and thoughtfully chosen pieces for a more intentional life.",
    story: [
      "AfriPebbles was inspired by the belief that we are not limited — that whatever we set our minds to do, as women, as people, we can achieve it all in the Lord.",
      "Just like a pebble may seem small, it can still create ripples that go far. AfriPebbles is a space that reminds people there's no ceiling on how far God can take them, and that with faith, intentionality, and small consistent steps, every dream is within reach.",
    ],
    vision:
      "To grow AfriPebbles into a trusted faith-rooted lifestyle brand where women come to be inspired, equipped, and gently transformed — spiritually, in beauty and health, financially, and in purpose.",
    mission:
      "AfriPebbles helps women glow up holistically — in faith, beauty, health, and financial stability — while walking in God's purpose for their lives, one small step at a time, through content, digital tools, and curated pieces for the home and self.",
    values: ["Faith", "Authenticity", "Intentional living", "Quality", "Community"],
  },

  /** The six areas of holistic growth the brand organizes itself around. */
  growthAreas: [
    {
      title: "Faith",
      description: "Rooted in timeless truths that anchor our everyday choices.",
    },
    {
      title: "Beauty",
      description: "Cultivating elegance in our environments, routines, and hearts.",
    },
    {
      title: "Health",
      description: "Nourishing the body and mind as vessels for purpose.",
    },
    {
      title: "Financial stability",
      description: "Stewarding resources wisely for stability and generosity.",
    },
    {
      title: "Purpose",
      description: "Walking intentionally in the specific calling meant for you.",
    },
    {
      title: "Intentional living",
      description: "Choosing slow, considered growth over rushed habits.",
    },
  ],

  podcast: {
    name: "The Glow Up Sanctuary",
    /** No launch date has been confirmed — treat the podcast as pre-launch until this flips. */
    hasLaunched: false,
    platform: "YouTube",
    topics: [
      "The Word of God and walking in His will",
      "Faith, beauty, and good health",
      "Financial stability and purpose",
      "Day-in-the-life, practical steps toward glowing up in each area",
    ],
  },

  audience: {
    countries: ["Ghana", "Germany", "and visitors worldwide"],
    ageRange: "18–35",
  },

  shop: {
    digitalCategories: ["E-books", "Planners", "Journals"],
    preorderCollectionName: "Shop Preorder",
    preorderDescription: "Seasonal DIY Christmas home decor — trees, ribbons, and similar pieces.",
    /**
     * Confirmed from the questionnaire — used as neutral, non-per-product
     * fallback copy. Individual products can override with their own
     * estimatedFulfilment text once known.
     */
    preorderFulfilmentWindow: "approximately two to three months",
    preorderClosingGuidance:
      "Pre-order windows typically close in late September or early October to allow delivery before Christmas.",
    currencies: ["EUR", "GHS"],
    futureCurrency: "USD",
  },

  recommendationCategories: [
    "Beauty",
    "Wellness",
    "Faith",
    "Books",
    "Lifestyle",
    "Home",
    "Productivity",
    "Financial Growth",
  ],

  /** Shown wherever curated/affiliate links are presented. */
  affiliateDisclosure:
    "Some links on this page are affiliate links. If you make a purchase through them, AfriPebbles may earn a small commission at no extra cost to you. We only recommend things we believe fit the AfriPebbles ethos.",

  collaborationTypes: [
    "UGC video",
    "Sponsored content",
    "Product feature",
    "Brand campaign",
    "Podcast collaboration",
    "Speaking or interview request",
    "Creative partnership",
    "Other",
  ],

  /**
   * No business email, phone number, or physical address has been confirmed
   * as live yet (no domain or hosting was set up at the time of the
   * questionnaire). Until confirmed, the contact form is the primary
   * contact method — do not publish an address/email as if it were live.
   */
  contact: {
    email: null as string | null,
    whatsapp: null as string | null,
    responseTimeConfirmed: false,
  },

  /** Only platforms the client confirmed using. No URLs were supplied yet, so all start unset. */
  social: {
    instagram: undefined,
    tiktok: undefined,
    youtube: undefined,
    facebook: undefined,
  } satisfies SocialConfig as SocialConfig,

  seo: {
    defaultTitle: "AfriPebbles — Faith-Rooted Lifestyle Brand for Women",
    defaultDescription:
      "AfriPebbles helps women glow up holistically in faith, beauty, health, and financial stability — through The Glow Up Sanctuary podcast, digital products, seasonal pre-orders, and curated recommendations.",
    titleTemplate: (page: string) => `${page} | AfriPebbles`,
    /**
     * The questionnaire names this as the *planned* domain — no domain is
     * registered yet. Used only as a scaffold for canonical URLs / sitemap
     * entries so the technical SEO plumbing is in place; not asserted
     * anywhere in visible copy as a live, working address.
     */
    plannedDomain: "https://afripebbles.com",
  },

  nav: {
    primary: [
      { href: "/about", label: "About" },
      { href: "/podcast", label: "The Glow Up Sanctuary" },
      { href: "/shop", label: "Shop" },
      { href: "/journal", label: "Journal" },
      { href: "/recommendations", label: "Recommendations" },
      { href: "/collaborate", label: "Collaborate" },
    ] satisfies NavLink[],
    footerExplore: [
      { href: "/about", label: "About Us" },
      { href: "/podcast", label: "The Glow Up Sanctuary" },
      { href: "/shop", label: "Shop" },
      { href: "/journal", label: "Journal" },
      { href: "/recommendations", label: "Recommendations" },
      { href: "/contact", label: "Contact" },
    ] satisfies NavLink[],
    footerLegal: [
      { href: "/faq", label: "FAQ" },
      { href: "/shipping", label: "Shipping & Delivery" },
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/preorder-policy", label: "Preorder Policy" },
      { href: "/digital-product-terms", label: "Digital Product Terms" },
      { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/terms", label: "Terms & Conditions" },
    ] satisfies NavLink[],
  },

  /** Shown on every policy/legal page until the client confirms final terms. */
  legalDraftNotice:
    "Draft information. Final terms will be published before transactions are enabled.",
} as const;

export function getConfiguredSocialLinks(): SocialLink[] {
  const labels: Record<keyof SocialConfig, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    facebook: "Facebook",
  };

  return (Object.keys(labels) as (keyof SocialConfig)[])
    .filter((key) => Boolean(siteConfig.social[key]))
    .map((key) => ({ label: labels[key], href: siteConfig.social[key]! }));
}
