import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useAdminListUgcEntries, ContentStatus } from "@workspace/api-client-react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../../components/StatusBadge";

export default function AdminUgcList() {
  const initialStatus = new URLSearchParams(useSearch()).get("status");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContentStatus | "all">((initialStatus as ContentStatus) || "all");

  const { data: entries, isLoading } = useAdminListUgcEntries({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">UGC Portfolio</h1>
          <p className="text-foreground/60">Collaboration and content-creation work samples.</p>
        </div>
        <Link href="/ugc/new">
          <Button className="gap-2">
            <Plus size={16} /> New entry
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <Input placeholder="Search by title or brand…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
        ) : !entries || entries.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">
            {search || status !== "all" ? "No entries match your filters." : "No UGC entries yet — add the first one."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/ugc/${entry.id}`} className="font-medium hover:text-primary">
                      {entry.title}
                    </Link>
                    {entry.isFeatured && <span className="ml-2 text-xs text-primary">★ featured</span>}
                  </TableCell>
                  <TableCell className="capitalize">{entry.mediaType}</TableCell>
                  <TableCell>{entry.brandName ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(entry.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
