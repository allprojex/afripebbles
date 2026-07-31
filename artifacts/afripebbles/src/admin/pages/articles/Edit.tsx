import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, ArrowLeft } from "lucide-react";
import {
  useAdminGetBlogPost,
  useAdminCreateBlogPost,
  useAdminUpdateBlogPost,
  useAdminDeleteBlogPost,
  ApiError,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ImageUploader } from "../../components/ImageUploader";
import { TagsInput } from "../../components/TagsInput";
import { DateTimeInput } from "../../components/DateTimeInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { slugify } from "../../lib/slugify";

const CONTENT_TYPES = ["article", "guide", "video", "vlog", "reflection", "wellness", "beauty", "financial"] as const;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  excerpt: z.string().min(1, "Excerpt is required"),
  content: z.string().min(1, "Body is required"),
  contentType: z.enum(CONTENT_TYPES),
  category: z.string().min(1, "Category is required"),
  coverImageUrl: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  authorDisplayName: z.string().nullable(),
  isFeatured: z.boolean(),
  readTimeMinutes: z.coerce.number().int().min(1),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  publishedAt: z.string(),
  tags: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  contentType: "article",
  category: "",
  coverImageUrl: null,
  youtubeUrl: null,
  authorDisplayName: null,
  isFeatured: false,
  readTimeMinutes: 5,
  status: "draft",
  scheduledAt: null,
  seoTitle: null,
  seoDescription: null,
  publishedAt: new Date().toISOString(),
  tags: [],
};

export default function AdminArticleEdit() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? undefined : Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, isLoading } = useAdminGetBlogPost(id!, { query: { enabled: !isNew && !Number.isNaN(id) } as any });
  const createMutation = useAdminCreateBlogPost();
  const updateMutation = useAdminUpdateBlogPost();
  const deleteMutation = useAdminDeleteBlogPost();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (post) form.reset(post);
  }, [post, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: "That slug is already in use." });
        return;
      }
      toast({ variant: "destructive", title: "Couldn't save article", description: err instanceof Error ? err.message : "Please try again." });
    };

    if (isNew) {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: (created) => {
            toast({ title: "Article created" });
            setLocation(`/admin/articles/${created.id}`);
          },
          onError,
        },
      );
    } else if (id !== undefined) {
      updateMutation.mutate({ id, data: values }, { onSuccess: () => toast({ title: "Article saved" }), onError });
    }
  };

  const handleDelete = () => {
    if (id === undefined) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Article deleted" });
          setLocation("/admin/articles");
        },
        onError: (err) => toast({ variant: "destructive", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (!isNew && isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;
  if (!isNew && !isLoading && !post) return <p className="text-foreground/60">Article not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/articles" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
            <ArrowLeft size={14} /> Articles
          </Link>
          <h1 className="text-3xl font-serif">{isNew ? "New article" : "Edit article"}</h1>
        </div>
        {!isNew && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 size={14} /> Delete
              </Button>
            }
            title="Delete this article?"
            description="This permanently removes it from the journal. This can't be undone."
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
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>Shown in listing cards and social previews.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Faith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => <ImageUploader bucket="article-images" label="Cover image" value={field.value} onChange={field.onChange} />}
            />
            <FormField
              control={form.control}
              name="youtubeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube URL (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author display name</FormLabel>
                  <FormControl>
                    <Input placeholder="AfriPebbles" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Body (Markdown)</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) =>
                showPreview ? (
                  <div className="prose prose-stone max-w-none border border-border rounded-lg p-4 min-h-[240px]">
                    <MarkdownContent content={field.value} />
                  </div>
                ) : (
                  <FormItem>
                    <FormControl>
                      <Textarea className="min-h-[240px] font-mono text-sm" {...field} />
                    </FormControl>
                    <FormDescription>Supports Markdown: headings, bold/italic, links, lists.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }
            />
            <FormField
              control={form.control}
              name="readTimeMinutes"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Read time (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
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
            <Link href="/admin/articles">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save article"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
