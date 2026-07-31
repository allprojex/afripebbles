import { useState } from "react";
import { useSearch } from "wouter";
import {
  useAdminListContactEnquiries,
  useAdminUpdateContactEnquiry,
  useAdminListCollaborationEnquiries,
  useAdminUpdateCollaborationEnquiry,
  EnquiryStatus,
  ContactEnquiry,
  CollaborationEnquiry,
} from "@workspace/api-client-react";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "../components/StatusBadge";
import { downloadCsv } from "../lib/csv";

type Tab = "contact" | "collaboration" | "product";

function ContactDetail({ enquiry, onClose }: { enquiry: ContactEnquiry; onClose: () => void }) {
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.internalNotes ?? "");
  const updateMutation = useAdminUpdateContactEnquiry();
  const { toast } = useToast();

  const save = () => {
    updateMutation.mutate(
      { id: enquiry.id, data: { status, internalNotes: notes || null } },
      { onSuccess: () => { toast({ title: "Enquiry updated" }); onClose(); } },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enquiry.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-foreground/50">Email:</span> {enquiry.email}
          </p>
          <p>
            <span className="text-foreground/50">Type:</span> {enquiry.inquiryType}
          </p>
          {enquiry.subject && (
            <p>
              <span className="text-foreground/50">Subject:</span> {enquiry.subject}
            </p>
          )}
          <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{enquiry.message}</p>
          <p className="text-xs text-foreground/40">Submitted {new Date(enquiry.createdAt).toLocaleString()}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as EnquiryStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Internal notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CollaborationDetail({ enquiry, onClose }: { enquiry: CollaborationEnquiry; onClose: () => void }) {
  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.internalNotes ?? "");
  const updateMutation = useAdminUpdateCollaborationEnquiry();
  const { toast } = useToast();

  const save = () => {
    updateMutation.mutate(
      { id: enquiry.id, data: { status, internalNotes: notes || null } },
      { onSuccess: () => { toast({ title: "Enquiry updated" }); onClose(); } },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enquiry.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-foreground/50">Email:</span> {enquiry.email}
          </p>
          {enquiry.company && (
            <p>
              <span className="text-foreground/50">Company:</span> {enquiry.company}
            </p>
          )}
          {enquiry.campaignType && (
            <p>
              <span className="text-foreground/50">Campaign type:</span> {enquiry.campaignType}
            </p>
          )}
          {enquiry.budgetRange && (
            <p>
              <span className="text-foreground/50">Budget:</span> {enquiry.budgetRange}
            </p>
          )}
          {enquiry.timeline && (
            <p>
              <span className="text-foreground/50">Timeline:</span> {enquiry.timeline}
            </p>
          )}
          {enquiry.links && (
            <p>
              <span className="text-foreground/50">Links:</span> {enquiry.links}
            </p>
          )}
          <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{enquiry.message}</p>
          <p className="text-xs text-foreground/40">Submitted {new Date(enquiry.createdAt).toLocaleString()}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as EnquiryStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Internal notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEnquiries() {
  const initialTab = (new URLSearchParams(useSearch()).get("tab") as Tab) || "contact";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EnquiryStatus | "all">("all");
  const [selectedContact, setSelectedContact] = useState<ContactEnquiry | null>(null);
  const [selectedCollaboration, setSelectedCollaboration] = useState<CollaborationEnquiry | null>(null);

  const contactQuery = useAdminListContactEnquiries(
    {
      search: search || undefined,
      status: status === "all" ? undefined : status,
      inquiryType: tab === "product" ? "product" : undefined,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: tab !== "collaboration" } as any },
  );
  const collaborationQuery = useAdminListCollaborationEnquiries(
    { search: search || undefined, status: status === "all" ? undefined : status },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: tab === "collaboration" } as any },
  );

  const isContactView = tab !== "collaboration";
  const rows = isContactView ? contactQuery.data : collaborationQuery.data;
  const isLoading = isContactView ? contactQuery.isLoading : collaborationQuery.isLoading;

  const handleExport = () => {
    if (!rows || rows.length === 0) return;
    downloadCsv(`${tab}-enquiries.csv`, rows as unknown as Record<string, unknown>[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">Enquiries</h1>
          <p className="text-foreground/60">Contact, collaboration, and product enquiries. Never exposed publicly.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!rows || rows.length === 0}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <Input placeholder="Search name, email, or message…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as EnquiryStatus | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-foreground/50 text-sm">Loading…</p>
        ) : !rows || rows.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">No enquiries match your filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => (isContactView ? setSelectedContact(row as ContactEnquiry) : setSelectedCollaboration(row as CollaborationEnquiry))}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {selectedContact && <ContactDetail enquiry={selectedContact} onClose={() => setSelectedContact(null)} />}
      {selectedCollaboration && <CollaborationDetail enquiry={selectedCollaboration} onClose={() => setSelectedCollaboration(null)} />}
    </div>
  );
}
