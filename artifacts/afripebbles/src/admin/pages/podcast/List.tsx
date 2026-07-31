import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useAdminListPodcastEpisodes, ContentStatus } from "@workspace/api-client-react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../../components/StatusBadge";

export default function AdminPodcastList() {
  const initialStatus = new URLSearchParams(useSearch()).get("status");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContentStatus | "all">((initialStatus as ContentStatus) || "all");

  const { data: episodes, isLoading } = useAdminListPodcastEpisodes({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">The Glow Up Sanctuary</h1>
          <p className="text-foreground/60">Podcast episodes. The public page stays in its coming-soon state until one is published.</p>
        </div>
        <Link href="/admin/podcast/new">
          <Button className="gap-2">
            <Plus size={16} /> New episode
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
        ) : !episodes || episodes.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">
            {search || status !== "all" ? "No episodes match your filters." : "No episodes yet — add the first one when it's ready."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Episode</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.map((episode) => (
                <TableRow key={episode.id}>
                  <TableCell>#{episode.episodeNumber}</TableCell>
                  <TableCell>
                    <Link href={`/admin/podcast/${episode.id}`} className="font-medium hover:text-primary">
                      {episode.title}
                    </Link>
                    {episode.isFeatured && <span className="ml-2 text-xs text-primary">★ featured</span>}
                  </TableCell>
                  <TableCell>{episode.guestName ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={episode.status} />
                  </TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(episode.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
