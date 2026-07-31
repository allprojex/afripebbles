import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, ArrowLeft } from "lucide-react";
import {
  useAdminGetPodcastEpisode,
  useAdminCreatePodcastEpisode,
  useAdminUpdatePodcastEpisode,
  useAdminDeletePodcastEpisode,
  ApiError,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../../components/ImageUploader";
import { TagsInput } from "../../components/TagsInput";
import { DateTimeInput } from "../../components/DateTimeInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { slugify } from "../../lib/slugify";

const schema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  episodeNumber: z.coerce.number().int().min(1, "Episode number is required"),
  season: z.coerce.number().int().nullable(),
  audioUrl: z.string().nullable(),
  externalUrl: z.string().nullable(),
  youtubeVideoId: z.string().nullable(),
  guestName: z.string().nullable(),
  showNotesUrl: z.string().nullable(),
  showNotes: z.string().nullable(),
  transcriptUrl: z.string().nullable(),
  transcript: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  durationSeconds: z.coerce.number().int().nullable(),
  isFeatured: z.boolean(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  publishedAt: z.string(),
  tags: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  slug: "",
  title: "",
  description: "",
  episodeNumber: 1,
  season: null,
  audioUrl: null,
  externalUrl: null,
  youtubeVideoId: null,
  guestName: null,
  showNotesUrl: null,
  showNotes: null,
  transcriptUrl: null,
  transcript: null,
  coverImageUrl: null,
  durationSeconds: null,
  isFeatured: false,
  status: "draft",
  scheduledAt: null,
  seoTitle: null,
  seoDescription: null,
  publishedAt: new Date().toISOString(),
  tags: [],
};

export default function AdminPodcastEdit() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? undefined : Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: episode, isLoading } = useAdminGetPodcastEpisode(id!, { query: { enabled: !isNew && !Number.isNaN(id) } as any });
  const createMutation = useAdminCreatePodcastEpisode();
  const updateMutation = useAdminUpdatePodcastEpisode();
  const deleteMutation = useAdminDeletePodcastEpisode();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (episode) form.reset(episode);
  }, [episode, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: "That slug is already in use." });
        return;
      }
      toast({ variant: "destructive", title: "Couldn't save episode", description: err instanceof Error ? err.message : "Please try again." });
    };

    if (isNew) {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: (created) => {
            toast({ title: "Episode created" });
            setLocation(`/admin/podcast/${created.id}`);
          },
          onError,
        },
      );
    } else if (id !== undefined) {
      updateMutation.mutate({ id, data: values }, { onSuccess: () => toast({ title: "Episode saved" }), onError });
    }
  };

  const handleDelete = () => {
    if (id === undefined) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Episode deleted" });
          setLocation("/admin/podcast");
        },
        onError: (err) => toast({ variant: "destructive", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (!isNew && isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;
  if (!isNew && !isLoading && !episode) return <p className="text-foreground/60">Episode not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/podcast" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
            <ArrowLeft size={14} /> Podcast
          </Link>
          <h1 className="text-3xl font-serif">{isNew ? "New episode" : "Edit episode"}</h1>
        </div>
        {!isNew && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 size={14} /> Delete
              </Button>
            }
            title="Delete this episode?"
            description="This permanently removes it from the podcast page. This can't be undone."
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
                    <Input
                      {...field}
                      onBlur={() => {
                        if (isNew && !form.getValues("slug")) form.setValue("slug", slugify(field.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => form.setValue("slug", slugify(form.getValues("title")), { shouldValidate: true })}>
                      Generate
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="episodeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Episode number</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => <ImageUploader bucket="podcast-covers" label="Cover image" value={field.value} onChange={field.onChange} />}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <TagsInput value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">YouTube &amp; platforms</h2>
            <FormField
              control={form.control}
              name="externalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtubeVideoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube embed ID</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>The video ID from the URL, used to embed the player.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio URL (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (seconds, optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Show notes &amp; transcript</h2>
            <FormField
              control={form.control}
              name="showNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Show notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showNotesUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Show notes link (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transcript"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcript</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[140px]" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transcriptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcript link (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">SEO</h2>
            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Publication</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publishedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publish date</FormLabel>
                    <DateTimeInput value={field.value} onChange={(v) => field.onChange(v ?? new Date().toISOString())} />
                  </FormItem>
                )}
              />
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
            </div>
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
            <Link href="/admin/podcast">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save episode"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
