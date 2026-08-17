import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, ArrowLeft } from "lucide-react";
import { useAdminGetTestimonial, useAdminCreateTestimonial, useAdminUpdateTestimonial, useAdminDeleteTestimonial } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../../components/ImageUploader";
import { DateTimeInput } from "../../components/DateTimeInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const schema = z.object({
  displayName: z.string().min(1, "Name is required"),
  roleCompany: z.string().nullable(),
  testimonialText: z.string().min(1, "Testimonial text is required"),
  imageUrl: z.string().nullable(),
  category: z.string().nullable(),
  isFeatured: z.boolean(),
  displayOrder: z.coerce.number().int(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  displayName: "",
  roleCompany: null,
  testimonialText: "",
  imageUrl: null,
  category: null,
  isFeatured: false,
  displayOrder: 0,
  status: "draft",
  scheduledAt: null,
};

export default function AdminTestimonialEdit() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? undefined : Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: testimonial, isLoading } = useAdminGetTestimonial(id!, { query: { enabled: !isNew && !Number.isNaN(id) } as any });
  const createMutation = useAdminCreateTestimonial();
  const updateMutation = useAdminUpdateTestimonial();
  const deleteMutation = useAdminDeleteTestimonial();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (testimonial) form.reset(testimonial);
  }, [testimonial, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const onError = (err: unknown) =>
      toast({ variant: "destructive", title: "Couldn't save testimonial", description: err instanceof Error ? err.message : "Please try again." });

    if (isNew) {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: (created) => {
            toast({ title: "Testimonial created" });
            setLocation(`/testimonials/${created.id}`);
          },
          onError,
        },
      );
    } else if (id !== undefined) {
      updateMutation.mutate({ id, data: values }, { onSuccess: () => toast({ title: "Testimonial saved" }), onError });
    }
  };

  const handleDelete = () => {
    if (id === undefined) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Testimonial deleted" });
          setLocation("/testimonials");
        },
        onError: (err) => toast({ variant: "destructive", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (!isNew && isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;
  if (!isNew && !isLoading && !testimonial) return <p className="text-foreground/60">Testimonial not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/testimonials" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
            <ArrowLeft size={14} /> Testimonials
          </Link>
          <h1 className="text-3xl font-serif">{isNew ? "New testimonial" : "Edit testimonial"}</h1>
        </div>
        {!isNew && (
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 size={14} /> Delete
              </Button>
            }
            title="Delete this testimonial?"
            description="This permanently removes it. This can't be undone."
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
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role / company (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="testimonialText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testimonial</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => <ImageUploader bucket="testimonial-images" value={field.value} onChange={field.onChange} />}
            />
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
            <Link href="/testimonials">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save testimonial"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
