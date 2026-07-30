/**
 * Draft legal/policy page content.
 *
 * None of this has been reviewed or approved as binding legal terms by the
 * client. Every page built from this file must show `siteConfig.legalDraftNotice`
 * prominently. Content here describes only what the website *actually* does
 * today (verified against the codebase) — it does not promise future
 * features as if they already exist.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalPageContent {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const privacyPolicy: LegalPageContent = {
  title: "Privacy Policy",
  intro:
    "This page describes what actually happens with your information on the AfriPebbles website today. It is a draft and will be replaced with a lawyer-reviewed policy before any checkout, accounts, or paid transactions go live.",
  sections: [
    {
      heading: "What we collect right now",
      body: [
        "The AfriPebbles website currently collects only what you choose to submit through a form: your name, email address, and message when you subscribe to the newsletter, submit a collaboration enquiry, or contact us.",
        "We do not currently use cookies for tracking, analytics, or advertising. We do not currently run Google Analytics, Meta Pixel, or any other tracking script.",
      ],
    },
    {
      heading: "How submitted information is used",
      body: [
        "Newsletter sign-ups are used only to send you AfriPebbles updates you asked for.",
        "Collaboration and contact enquiries are used only to respond to your message.",
        "We do not sell or share your information with third parties for marketing purposes.",
      ],
    },
    {
      heading: "Where information is stored",
      body: [
        "Form submissions are stored in AfriPebbles' own database to allow us to respond to you. We do not yet use a separate payment processor, CRM, or email marketing platform — if that changes, this policy will be updated first.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "You can ask us to delete your information or unsubscribe at any time by contacting us through the Contact page.",
        "Because the founder is based in Germany and the site serves visitors across the EU, GDPR principles guide how we handle your data even while this policy is still in draft form.",
      ],
    },
  ],
};

export const cookiePolicy: LegalPageContent = {
  title: "Cookie Policy",
  intro:
    "A short, honest note on cookies — this is a draft and will be expanded if the site's technical setup changes (for example, if analytics or a shopping cart are added later).",
  sections: [
    {
      heading: "Current cookie use",
      body: [
        "The AfriPebbles website does not currently set any tracking, advertising, or analytics cookies.",
        "If a future version of the site adds features that require cookies (such as a shopping cart or analytics), this page will be updated and, where required, you will be asked for consent first.",
      ],
    },
  ],
};

export const termsAndConditions: LegalPageContent = {
  title: "Terms & Conditions",
  intro:
    "Draft terms covering how the AfriPebbles website may be used today. Final terms — including any covering paid purchases — will be published before checkout is enabled.",
  sections: [
    {
      heading: "Using this website",
      body: [
        "The content, brand names, and imagery on this website belong to AfriPebbles unless otherwise noted.",
        "You're welcome to browse, read, and share links to this site. Please don't copy or republish AfriPebbles content without permission.",
      ],
    },
    {
      heading: "No live transactions yet",
      body: [
        "The Shop currently does not process live payments. Any 'pre-order' or 'enquire' action registers your interest — it does not create a binding order until AfriPebbles confirms details with you directly.",
      ],
    },
  ],
};

export const shippingPolicy: LegalPageContent = {
  title: "Shipping & Delivery",
  intro:
    "AfriPebbles ships internationally, door-to-door. Specific costs and timeframes are confirmed per product — this page will be finalized once the shop's checkout is live.",
  sections: [
    {
      heading: "What we can confirm today",
      body: [
        "AfriPebbles intends to ship internationally, door-to-door, with shipping cost fixed per product rather than calculated automatically.",
        "Seasonal pre-order items (such as the Shop Preorder decor collection) generally take approximately two to three months to fulfil, with order windows typically closing in late September or early October to allow delivery before Christmas.",
      ],
    },
    {
      heading: "Not yet confirmed",
      body: [
        "Exact shipping costs per region, carrier details, and precise delivery windows have not been finalized. These will be shown on each product and confirmed at checkout once ordering is enabled.",
      ],
    },
  ],
};

export const returnsPolicy: LegalPageContent = {
  title: "Returns & Refunds",
  intro:
    "AfriPebbles has not yet finalized a returns and refunds policy, since the shop does not process live payments yet. This page will be completed before checkout is enabled.",
  sections: [
    {
      heading: "Status",
      body: [
        "No return or refund terms have been confirmed yet. If you have a question about a specific product or pre-order, please reach out via the Contact page and we'll respond directly.",
      ],
    },
  ],
};

export const preorderPolicy: LegalPageContent = {
  title: "Preorder Policy",
  intro:
    "How AfriPebbles' seasonal pre-orders (such as the Shop Preorder decor collection) are intended to work.",
  sections: [
    {
      heading: "How pre-orders work",
      body: [
        "Pre-orders are only used for the seasonal Shop Preorder collection — digital products are available immediately and never require a pre-order.",
        "Customers place a pre-order during an open ordering window. Because fulfilment takes approximately two to three months, pre-order windows typically need to close by late September or early October at the latest to guarantee delivery before Christmas.",
      ],
    },
    {
      heading: "Per-product details",
      body: [
        "Exact opening dates, closing dates, and estimated delivery windows are shown on each pre-order product once confirmed. Where a product doesn't yet have confirmed dates, its page will say so plainly rather than guess.",
      ],
    },
  ],
};

export const affiliateDisclosurePage: LegalPageContent = {
  title: "Affiliate Disclosure",
  intro:
    "Transparency about how AfriPebbles' Recommendations page works.",
  sections: [
    {
      heading: "Our disclosure",
      body: [
        "Some links on the Recommendations page are affiliate links. If you make a purchase through them, AfriPebbles may earn a small commission at no extra cost to you.",
        "We only recommend things we believe fit the AfriPebbles ethos. A recommendation is only described as personally tested when that has been confirmed by AfriPebbles.",
      ],
    },
  ],
};

export const digitalProductTerms: LegalPageContent = {
  title: "Digital Product Terms",
  intro:
    "Draft terms for AfriPebbles' digital products (e-books, planners, and journals).",
  sections: [
    {
      heading: "What you're purchasing",
      body: [
        "Digital products (e-books, planners, and journals) are intended for personal use. Redistribution or resale is not permitted without AfriPebbles' written permission.",
        "Digital products are delivered by download and are available immediately — no pre-order is needed for them.",
      ],
    },
    {
      heading: "Not yet live",
      body: [
        "Digital checkout is not yet connected on this website. Once it is, these terms will be reviewed and finalized alongside the payment provider's own requirements.",
      ],
    },
  ],
};
