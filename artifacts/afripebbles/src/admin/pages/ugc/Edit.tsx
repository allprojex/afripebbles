import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, ArrowLeft } from "lucide-react";
import { useAdminGetUgcEntry, useAdminCreateUgcEntry, useAdminUpdateUgcEntry, useAdminDeleteUgcEntry } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../../components/ImageUploader";
import { DateTimeInput } from "../../components/DateTimeInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  projectCategory: z.string().nullable(),
  mediaType: z.enum(["image", "video"]),
  imageUrl: z.string().nullable(),
  youtubeVideoId: z.string().nullable(),
  brandName: z.string().nullable(),
  externalLink: z.string().nullable(),
  isFeatured: z.boolean(),
  displayOrder: z.coerce.number().int(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  title: "",
  description: "",
  projectCategory: null,
  mediaType: "image",
  imageUrl: null,
  youtubeVideoId: null,
  brandName: null,
  externalLink: null,
  isFeatured: false,
  displayOrder: 0,
  status: "draft",
  scheduledAt: null,
};

export default function AdminUgcEdit() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? undefined : Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entry, isLoading } = useAdminGetUgcEntry(id!, { query: { enabled: !isNew && !Number.isNaN(id) } as any });
  const createMutation = useAdminCreateUgcEntry();
  const updateMutation = useAdminUpdateUgcEntry();
  const deleteMutation = useAdminDeleteUgcEntry();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (entry) form.reset(entry);
  }, [entry, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const onError = (err: unknown) =>
      toast({ variant: "destructive", title: "Couldn't save entry", description: err instanceof Error ? err.message : "Please try again." });

    if (isNew) {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: (created) => {
            toast({ title: "Entry created" });
            setLocation(`/ugc/${created.id}`);
          },
          onError,
        },
      );
    } else if (id !== undefined) {
      updateMutation.mutate({ id, data: values }, { onSuccess: () => toast({ title: "Entry saved" }), onError });
    }
  };

  const handleDelete = () => {
    if (id === undefined) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Entry deleted" });
          setLocation("/ugc");
        },
        onError: (err) => toast({ variant: "destructive", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (!isNew && isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;
  if (!isNew && !isLoading && !entry) return <p className="text-foreground/60">Entry not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ugc" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
            <ArrowLeft size={14} /> UGC Portfolio
          </Link>
          <h1 className="text-3xl font-serif">{isNew ? "New UGC entry" : "Edit UGC entry"}</h1>
        </div>
        {!isNew && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 size={14} /> Delete
              </Button>
            }
            title="Delete this entry?"
            description="This permanently removes it from the UGC portfolio. This can't be undone."
            onConfirm={handleDelete}
          />
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Details</h2>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project / category</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand name (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External link (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Media</h2>
            <FormField
              control={form.control}
              name="mediaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video (YouTube)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {form.watch("mediaType") === "image" ? (
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => <ImageUploader bucket="ugc-media" value={field.value} onChange={field.onChange} />}
              />
            ) : (
              <FormField
                control={form.control}
                name="youtubeVideoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube video ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. dQw4w9WgXcQ" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                    <FormDescription>The id portion of the YouTube URL, not the full link.</FormDescription>
                  </FormItem>
                )}
              />
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Display</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                    <FormLabel>Featured</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Publication</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {form.watch("status") === "scheduled" && (
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish at</FormLabel>
                      <DateTimeInput value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link href="/ugc">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
