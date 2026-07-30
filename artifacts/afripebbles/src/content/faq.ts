/**
 * FAQ content. Every answer is traceable to a confirmed questionnaire
 * answer or to verifiable current site behavior. Where the client hasn't
 * decided yet, the question is either omitted or answered with cautious,
 * non-committal wording rather than an invented policy.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  section: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    section: "About AfriPebbles",
    items: [
      {
        question: "What is AfriPebbles?",
        answer:
          "AfriPebbles is a faith-rooted lifestyle brand helping women glow up holistically — in faith, beauty, health, and financial stability — while walking in God's purpose, one small step at a time. It brings together The Glow Up Sanctuary podcast, digital products, seasonal pre-order decor, curated recommendations, and UGC collaborations under one name.",
      },
      {
        question: "Who is AfriPebbles for?",
        answer:
          "Women, generally ages 18–35, who want to grow intentionally in faith, beauty, wellness, and purpose. AfriPebbles also works with brands looking for authentic UGC content creators.",
      },
      {
        question: "Where is AfriPebbles based, and who do you serve?",
        answer:
          "The founder is based in Germany. AfriPebbles serves customers in Ghana, Germany, and globally — the brand isn't limited to one country or region.",
      },
    ],
  },
  {
    section: "Digital products",
    items: [
      {
        question: "What digital products do you offer?",
        answer:
          "E-books, digital planners, and digital journals. Digital products are available immediately — no pre-order is required.",
      },
    ],
  },
  {
    section: "Preorders",
    items: [
      {
        question: "What is the Shop Preorder collection?",
        answer:
          "A seasonal collection of DIY Christmas home decor — trees, ribbons, and similar pieces — available only during an open pre-order window.",
      },
      {
        question: "How long does a pre-order take to arrive?",
        answer:
          "Fulfilment generally takes approximately two to three months. Pre-order windows typically close in late September or early October at the latest, to allow delivery before Christmas. Exact dates are shown on each pre-order product.",
      },
      {
        question: "Can I customize a pre-order item?",
        answer: "Yes — AfriPebbles accepts custom orders, and products can come in different variations, sizes, and colors.",
      },
    ],
  },
  {
    section: "Shipping",
    items: [
      {
        question: "Do you ship internationally?",
        answer:
          "Yes, AfriPebbles ships internationally, door-to-door. See the Shipping & Delivery page for what's confirmed so far.",
      },
    ],
  },
  {
    section: "Collaborations",
    items: [
      {
        question: "Does AfriPebbles work with brands?",
        answer:
          "Yes — AfriPebbles offers UGC content creation, product photography, sponsored posts, and brand ambassadorships. Visit the Collaborate page to start a conversation.",
      },
    ],
  },
  {
    section: "Podcast",
    items: [
      {
        question: "What is The Glow Up Sanctuary?",
        answer:
          "AfriPebbles' podcast, covering the Word of God and walking in His will — holistically, across faith, beauty, health, financial stability, and purpose — plus practical day-in-the-life steps.",
      },
      {
        question: "Where can I listen?",
        answer:
          "The Glow Up Sanctuary is planned for YouTube, with episodes embedded directly on the Podcast page once available.",
      },
    ],
  },
  {
    section: "Recommendations",
    items: [
      {
        question: "Are the Recommendations page links affiliate links?",
        answer:
          "Some of them are. See the Affiliate Disclosure page for details — AfriPebbles only recommends things that fit the brand's values.",
      },
    ],
  },
  {
    section: "Contact",
    items: [
      {
        question: "How do I get in touch?",
        answer:
          "Use the Contact page for general questions, collaboration enquiries, or order support — it's currently the most reliable way to reach AfriPebbles.",
      },
    ],
  },
];
