/** draft: not visible publicly. scheduled: visible once scheduledAt is due. published: visible now. archived: no longer visible. */
export const CONTENT_STATUS = ["draft", "scheduled", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

/** Lifecycle for enquiry/contact-style records triaged in the admin area. */
export const ENQUIRY_STATUS = ["new", "read", "resolved", "archived"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUS)[number];

/** V1 has no embedded gateway — payment happens outside the app and is confirmed manually by an admin. */
export const PAYMENT_METHOD = ["paypal", "mobile_money", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

/** Independent of order_status — a paid order can still be pending_payment→paid before fulfilment starts. */
export const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** Fulfilment lifecycle — kept separate from payment_status by design. */
export const ORDER_STATUS = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const COUPON_DISCOUNT_TYPE = ["percentage", "fixed"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPE)[number];

/** Audit trail: which admin-editable field changed on an order, and when. */
export const ORDER_HISTORY_FIELD = ["payment_status", "order_status"] as const;
export type OrderHistoryField = (typeof ORDER_HISTORY_FIELD)[number];

/** Admin-configurable manual-payment instructions shown on the order confirmation page. */
export interface MobileMoneyDetails {
  provider: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
}

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ibanOrSwift?: string;
  instructions: string;
}
