import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  new: "New",
  read: "Read",
  resolved: "Resolved",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  published: "default",
  archived: "destructive",
  new: "default",
  read: "secondary",
  resolved: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
