import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useAdminListTestimonials, ContentStatus } from "@workspace/api-client-react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../../components/StatusBadge";

export default function AdminTestimonialsList() {
  const initialStatus = new URLSearchParams(useSearch()).get("status");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContentStatus | "all">((initialStatus as ContentStatus) || "all");

  const { data: testimonials, isLoading } = useAdminListTestimonials({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">Testimonials</h1>
          <p className="text-foreground/60">Shown on the homepage when published.</p>
        </div>
        <Link href="/testimonials/new">
          <Button className="gap-2">
            <Plus size={16} /> New testimonial
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <Input placeholder="Search by name or role…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
        ) : !testimonials || testimonials.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">
            {search || status !== "all" ? "No testimonials match your filters." : "No testimonials yet — add the first one."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role / company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials.map((testimonial) => (
                <TableRow key={testimonial.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/testimonials/${testimonial.id}`} className="font-medium hover:text-primary">
                      {testimonial.displayName}
                    </Link>
                    {testimonial.isFeatured && <span className="ml-2 text-xs text-primary">★ featured</span>}
                  </TableCell>
                  <TableCell>{testimonial.roleCompany ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={testimonial.status} />
                  </TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(testimonial.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
