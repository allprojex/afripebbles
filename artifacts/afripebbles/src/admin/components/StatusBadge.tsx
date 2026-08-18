import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  new: "New",
  read: "Read",
  resolved: "Resolved",
  active: "Active",
  unsubscribed: "Unsubscribed",
  // Order payment_status
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  // Order order_status
  pending_payment: "Pending Payment",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  published: "default",
  archived: "destructive",
  new: "default",
  read: "secondary",
  resolved: "outline",
  active: "default",
  unsubscribed: "destructive",
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  refunded: "outline",
  cancelled: "destructive",
  pending_payment: "secondary",
  processing: "secondary",
  shipped: "default",
  delivered: "default",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
