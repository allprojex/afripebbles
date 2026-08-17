import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
import {
  useAdminGetProduct,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
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
import { MultiImageUploader } from "../../components/MultiImageUploader";
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
  shortDescription: z.string().nullable(),
  price: z.coerce.number().min(0, "Price can't be negative"),
  currency: z.string().min(1, "Currency is required"),
  type: z.enum(["digital", "physical"]),
  category: z.string().nullable(),
  imageUrl: z.string().nullable(),
  images: z.array(z.string()),
  previewImageUrl: z.string().nullable(),
  availability: z.enum(["available", "preorder", "coming_soon", "out_of_stock"]),
  stockStatus: z.enum(["in_stock", "limited", "out_of_stock"]),
  isFeatured: z.boolean(),
  downloadUrl: z.string().nullable(),
  preorderOpensAt: z.string().nullable(),
  preorderClosesAt: z.string().nullable(),
  estimatedFulfilment: z.string().nullable(),
  regions: z.array(z.string()),
  variants: z.array(z.object({ label: z.string().min(1, "Label is required"), options: z.array(z.string()) })),
  externalPurchaseUrl: z.string().nullable(),
  tags: z.array(z.string()),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  slug: "",
  title: "",
  description: "",
  shortDescription: null,
  price: 0,
  currency: "EUR",
  type: "digital",
  category: null,
  imageUrl: null,
  images: [],
  previewImageUrl: null,
  availability: "available",
  stockStatus: "in_stock",
  isFeatured: false,
  downloadUrl: null,
  preorderOpensAt: null,
  preorderClosesAt: null,
  estimatedFulfilment: null,
  regions: [],
  variants: [],
  externalPurchaseUrl: null,
  tags: [],
  status: "draft",
  scheduledAt: null,
  seoTitle: null,
  seoDescription: null,
};

export default function AdminProductEdit() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? undefined : Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: product, isLoading } = useAdminGetProduct(id!, { query: { enabled: !isNew && !Number.isNaN(id) } as any });
  const createMutation = useAdminCreateProduct();
  const updateMutation = useAdminUpdateProduct();
  const deleteMutation = useAdminDeleteProduct();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });
  const variantsArray = useFieldArray({ control: form.control, name: "variants" });

  useEffect(() => {
    if (product) form.reset(product);
  }, [product, form]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: err.data && typeof err.data === "object" && "error" in err.data ? String((err.data as { error: string }).error) : "That slug is already in use." });
        return;
      }
      toast({ variant: "destructive", title: "Couldn't save product", description: err instanceof Error ? err.message : "Please try again." });
    };

    if (isNew) {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: (created) => {
            toast({ title: "Product created" });
            setLocation(`/products/${created.id}`);
          },
          onError,
        },
      );
    } else if (id !== undefined) {
      updateMutation.mutate(
        { id, data: values },
        {
          onSuccess: () => toast({ title: "Product saved" }),
          onError,
        },
      );
    }
  };

  const handleDelete = () => {
    if (id === undefined) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Product deleted" });
          setLocation("/products");
        },
        onError: (err) => toast({ variant: "destructive", title: "Couldn't delete product", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (!isNew && isLoading) {
    return <p className="text-foreground/50 text-sm">Loading…</p>;
  }

  if (!isNew && !isLoading && !product) {
    return <p className="text-foreground/60">Product not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
            <ArrowLeft size={14} /> Products
          </Link>
          <h1 className="text-3xl font-serif">{isNew ? "New product" : "Edit product"}</h1>
        </div>
        {!isNew && (
          <div className="flex gap-2">
            <a href={`/admin/products/${id}/preview`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye size={14} /> Preview
              </Button>
            </a>
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 size={14} /> Delete
                </Button>
              }
              title="Delete this product?"
              description="This permanently removes the product. This can't be undone."
              onConfirm={handleDelete}
            />
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Basic info</h2>
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
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short description</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Shown in listing cards.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[140px]" {...field} />
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
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Pricing &amp; type</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Digital or physical</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <FormLabel>Featured</FormLabel>
                    <FormDescription>Shown on the homepage and at the top of the shop.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Images</h2>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => <ImageUploader bucket="product-images" label="Featured image" value={field.value} onChange={field.onChange} />}
            />
            <FormField
              control={form.control}
              name="previewImageUrl"
              render={({ field }) => (
                <ImageUploader bucket="product-images" label="Preview image (digital products)" value={field.value} onChange={field.onChange} />
              )}
            />
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => <MultiImageUploader bucket="product-images" value={field.value} onChange={field.onChange} />}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Availability &amp; stock</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="preorder">Pre-order</SelectItem>
                        <SelectItem value="coming_soon">Coming soon</SelectItem>
                        <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in_stock">In stock</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </section>

          {form.watch("availability") === "preorder" && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Pre-order details</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preorderOpensAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens</FormLabel>
                      <DateTimeInput value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preorderClosesAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes</FormLabel>
                      <DateTimeInput value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="estimatedFulfilment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated fulfilment</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="approximately two to three months"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="regions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery regions</FormLabel>
                    <TagsInput value={field.value} onChange={field.onChange} placeholder="e.g. Ghana, Germany" />
                  </FormItem>
                )}
              />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Variants</h2>
            {variantsArray.fields.map((variantField, index) => (
              <div key={variantField.id} className="flex items-start gap-3 border border-border rounded-lg p-4">
                <div className="flex-1 space-y-3">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Size" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variants.${index}.options`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Options</FormLabel>
                        <TagsInput value={field.value} onChange={field.onChange} placeholder="e.g. Small, Medium, Large" />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => variantsArray.remove(index)} aria-label="Remove variant">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => variantsArray.append({ label: "", options: [] })}>
              <Plus size={14} /> Add variant
            </Button>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Purchase &amp; download</h2>
            <FormField
              control={form.control}
              name="externalPurchaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External purchase link</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>If set, the shop links out here instead of the enquiry form.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="downloadUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Download URL (digital products)</FormLabel>
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
            <Link href="/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save product"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
