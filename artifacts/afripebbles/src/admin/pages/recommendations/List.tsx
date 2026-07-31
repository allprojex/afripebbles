import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useAdminListCuratedPicks, ContentStatus } from "@workspace/api-client-react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../../components/StatusBadge";

export default function AdminRecommendationsList() {
  const initialStatus = new URLSearchParams(useSearch()).get("status");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContentStatus | "all">((initialStatus as ContentStatus) || "all");

  const { data: picks, isLoading } = useAdminListCuratedPicks({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">Recommendations</h1>
          <p className="text-foreground/60">Curated affiliate and non-affiliate picks.</p>
        </div>
        <Link href="/admin/recommendations/new">
          <Button className="gap-2">
            <Plus size={16} /> New recommendation
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <Input placeholder="Search by title or slug…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-foreground/50 text-sm">Loading…</p>
        ) : !picks || picks.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">
            {search || status !== "all" ? "No recommendations match your filters." : "No recommendations yet — add the first one."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {picks.map((pick) => (
                <TableRow key={pick.id}>
                  <TableCell>
                    <Link href={`/admin/recommendations/${pick.id}`} className="font-medium hover:text-primary">
                      {pick.title}
                    </Link>
                    {pick.isFeatured && <span className="ml-2 text-xs text-primary">★ featured</span>}
                  </TableCell>
                  <TableCell>{pick.category}</TableCell>
                  <TableCell>{pick.isAffiliate ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <StatusBadge status={pick.status} />
                  </TableCell>
                  <TableCell>{pick.displayOrder}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
