/** draft: not visible publicly. scheduled: visible once scheduledAt is due. published: visible now. archived: no longer visible. */
export const CONTENT_STATUS = ["draft", "scheduled", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

/** Lifecycle for enquiry/contact-style records triaged in the admin area. */
export const ENQUIRY_STATUS = ["new", "read", "resolved", "archived"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUS)[number];
