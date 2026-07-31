import { useState } from "react";
import { useAdminListNewsletterSubscriptions } from "@workspace/api-client-react";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "../lib/csv";

export default function AdminNewsletter() {
  const [search, setSearch] = useState("");
  const { data: subscribers, isLoading } = useAdminListNewsletterSubscriptions({ search: search || undefined });

  const handleExport = () => {
    if (!subscribers || subscribers.length === 0) return;
    downloadCsv("newsletter-subscribers.csv", subscribers as unknown as Record<string, unknown>[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">Newsletter subscribers</h1>
          <p className="text-foreground/60">Private list — never exposed through public APIs.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!subscribers || subscribers.length === 0}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
        <Input placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-foreground/50 text-sm">Loading…</p>
        ) : !subscribers || subscribers.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">{search ? "No subscribers match your search." : "No subscribers yet."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>First name</TableHead>
                <TableHead>Subscribed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.email}</TableCell>
                  <TableCell>{sub.firstName ?? "—"}</TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
