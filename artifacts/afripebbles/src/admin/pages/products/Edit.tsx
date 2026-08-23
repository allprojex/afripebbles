import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm, useFieldArray, type Control, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ArrowLeft, ArrowUp, ArrowDown, Eye } from "lucide-react";
import {
  useAdminGetProduct,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
  ApiError,
  type Product,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../../components/ImageUploader";
import { MultiImageUploader, MultiImageUploaderWithThumbnails } from "../../components/MultiImageUploader";
import { DigitalFileUploader } from "../../components/DigitalFileUploader";
import { TagsInput } from "../../components/TagsInput";
import { DateTimeInput } from "../../components/DateTimeInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { slugify } from "../../lib/slugify";

const optionValueSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Internal value is required"),
  priceAdjustment: z.coerce.number(),
  sku: z.string().nullable(),
  imageUrl: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});

const optionGroupSchema = z.object({
  key: z.string().min(1, "Internal key is required"),
  label: z.string().min(1, "Label is required"),
  required: z.boolean(),
  helpText: z.string().nullable(),
  isActive: z.boolean(),
  values: z.array(optionValueSchema),
});

// z.union([z.coerce.number(), z.null()]) is a trap here: z.coerce.number() runs Number(null) === 0
// and "succeeds", so the null branch never gets a chance — every blank override would silently
// save as an actual €0 override instead of "no override". Preprocess to null explicitly instead.
const nullableNumber = z.preprocess((v) => (v === null || v === undefined || v === "" ? null : Number(v)), z.number().nullable());

const varietySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  priceOverride: nullableNumber,
  shippingAmountOverride: nullableNumber,
  availabilityOverride: z.string().nullable(),
  isActive: z.boolean(),
  images: z.array(z.object({ url: z.string(), thumbnailUrl: z.string().nullable() })),
});

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
  thumbnailUrl: z.string().nullable(),
  images: z.array(z.string()),
  previewImageUrl: z.string().nullable(),
  availability: z.enum(["available", "preorder", "coming_soon", "out_of_stock"]),
  stockStatus: z.enum(["in_stock", "limited", "out_of_stock"]),
  isFeatured: z.boolean(),
  downloadUrl: z.string().nullable(),
  shippingAmount: z.coerce.number().min(0, "Can't be negative"),
  digitalDownloadPath: z.string().nullable(),
  preorderOpensAt: z.string().nullable(),
  preorderClosesAt: z.string().nullable(),
  estimatedFulfilment: z.string().nullable(),
  regions: z.array(z.string()),
  variants: z.array(z.object({ label: z.string().min(1, "Label is required"), options: z.array(z.string()) })),
  optionGroups: z.array(optionGroupSchema),
  varieties: z.array(varietySchema),
  gallery: z.array(z.object({ url: z.string(), thumbnailUrl: z.string().nullable() })),
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
  thumbnailUrl: null,
  images: [],
  previewImageUrl: null,
  availability: "available",
  stockStatus: "in_stock",
  isFeatured: false,
  downloadUrl: null,
  shippingAmount: 0,
  digitalDownloadPath: null,
  preorderOpensAt: null,
  preorderClosesAt: null,
  estimatedFulfilment: null,
  regions: [],
  variants: [],
  optionGroups: [],
  varieties: [],
  gallery: [],
  externalPurchaseUrl: null,
  tags: [],
  status: "draft",
  scheduledAt: null,
  seoTitle: null,
  seoDescription: null,
};

/** The loaded product carries ids/displayOrder (server read shape) — the form only needs the editable fields; array order stands in for displayOrder. */
function toFormValues(product: Product): FormValues {
  return {
    ...DEFAULT_VALUES,
    ...product,
    optionGroups: product.optionGroups.map((g) => ({
      key: g.key,
      label: g.label,
      required: g.required,
      helpText: g.helpText,
      isActive: g.isActive,
      values: g.values.map((v) => ({
        label: v.label,
        value: v.value,
        priceAdjustment: v.priceAdjustment,
        sku: v.sku,
        imageUrl: v.imageUrl,
        description: v.description,
        isActive: v.isActive,
      })),
    })),
    varieties: product.varieties.map((v) => ({
      name: v.name,
      description: v.description,
      sku: v.sku,
      priceOverride: v.priceOverride,
      shippingAmountOverride: v.shippingAmountOverride,
      availabilityOverride: v.availabilityOverride,
      isActive: v.isActive,
      images: v.images.map((img) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl })),
    })),
    gallery: product.gallery.map((img) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl })),
  };
}

/** Inverse of toFormValues — reconstructs the nested object shape (ProductOptionGroupInput/ProductVarietyInput/ProductImageInput) the admin API expects. */
function toSubmitPayload(values: FormValues) {
  return values;
}

const AVAILABILITY_OVERRIDE_INHERIT = "__inherit__";

function OptionGroupEditor({ form, groupIndex, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  form: UseFormReturn<FormValues>;
  groupIndex: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const valuesArray = useFieldArray({ control: form.control, name: `optionGroups.${groupIndex}.values` });

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <FormField
            control={form.control}
            name={`optionGroups.${groupIndex}.label`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Option group label</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Size, Color, Dimensions"
                    {...field}
                    onBlur={() => {
                      if (!form.getValues(`optionGroups.${groupIndex}.key`)) {
                        form.setValue(`optionGroups.${groupIndex}.key`, slugify(field.value));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`optionGroups.${groupIndex}.helpText`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Help text (optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`optionGroups.${groupIndex}.required`}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Required — a customer must choose a value</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move option group up">
            <ArrowUp size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move option group down">
            <ArrowDown size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove option group">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-3 pl-4 border-l border-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Values</div>
        {valuesArray.fields.map((valueField, valueIndex) => (
          <div key={valueField.id} className="flex items-start gap-3 border border-border/60 rounded-lg p-3">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.label`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Large"
                        {...field}
                        onBlur={() => {
                          if (!form.getValues(`optionGroups.${groupIndex}.values.${valueIndex}.value`)) {
                            form.setValue(`optionGroups.${groupIndex}.values.${valueIndex}.value`, slugify(field.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.priceAdjustment`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price adjustment</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>Added to (or, if negative, subtracted from) the base price.</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.sku`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.isActive`}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.imageUrl`}
                render={({ field }) => <ImageUploader bucket="product-images" label="Swatch image (optional)" value={field.value} onChange={field.onChange} />}
              />
              <FormField
                control={form.control}
                name={`optionGroups.${groupIndex}.values.${valueIndex}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => valuesArray.remove(valueIndex)} aria-label="Remove value">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            valuesArray.append({ label: "", value: "", priceAdjustment: 0, sku: null, imageUrl: null, description: null, isActive: true })
          }
        >
          <Plus size={14} /> Add value
        </Button>
      </div>
    </div>
  );
}

function VarietyEditor({ control, form, varietyIndex, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  control: Control<FormValues>;
  form: UseFormReturn<FormValues>;
  varietyIndex: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.name`}
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Variety name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Burgundy set" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.description`}
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.priceOverride`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price override (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Replaces the base price entirely when set.</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.shippingAmountOverride`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping override (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.sku`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU (optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.availabilityOverride`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Availability override</FormLabel>
                <Select value={field.value ?? AVAILABILITY_OVERRIDE_INHERIT} onValueChange={(v) => field.onChange(v === AVAILABILITY_OVERRIDE_INHERIT ? null : v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={AVAILABILITY_OVERRIDE_INHERIT}>Inherit from product</SelectItem>
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
            control={control}
            name={`varieties.${varietyIndex}.isActive`}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`varieties.${varietyIndex}.images`}
            render={({ field }) => (
              <div className="col-span-2">
                <MultiImageUploaderWithThumbnails bucket="product-images" value={field.value} onChange={field.onChange} />
              </div>
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move variety up">
            <ArrowUp size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move variety down">
            <ArrowDown size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove variety">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      {form.formState.errors.varieties?.[varietyIndex]?.name && (
        <p className="text-sm text-destructive">{form.formState.errors.varieties[varietyIndex]?.name?.message}</p>
      )}
    </div>
  );
}

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
  const optionGroupsArray = useFieldArray({ control: form.control, name: "optionGroups" });
  const varietiesArray = useFieldArray({ control: form.control, name: "varieties" });

  useEffect(() => {
    if (product) form.reset(toFormValues(product));
  }, [product, form]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const hasLegacyVariantsOnly = form.watch("variants").length > 0 && optionGroupsArray.fields.length === 0;

  const convertLegacyVariants = () => {
    const legacy = form.getValues("variants");
    for (const group of legacy) {
      optionGroupsArray.append({
        key: slugify(group.label),
        label: group.label,
        required: true,
        helpText: null,
        isActive: true,
        values: group.options.map((option) => ({
          label: option,
          value: slugify(option),
          priceAdjustment: 0,
          sku: null,
          imageUrl: null,
          description: null,
          isActive: true,
        })),
      });
    }
  };

  const onSubmit = (values: FormValues) => {
    const payload = toSubmitPayload(values);
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: err.data && typeof err.data === "object" && "error" in err.data ? String((err.data as { error: string }).error) : "That slug is already in use." });
        return;
      }
      toast({ variant: "destructive", title: "Couldn't save product", description: err instanceof Error ? err.message : "Please try again." });
    };

    if (isNew) {
      createMutation.mutate(
        { data: payload },
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
        { id, data: payload },
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
              render={({ field }) => (
                <ImageUploader
                  bucket="product-images"
                  label="Featured image"
                  value={field.value}
                  onChange={(url) => {
                    field.onChange(url);
                    if (!url) form.setValue("thumbnailUrl", null);
                  }}
                  onUploadedMeta={(meta) => form.setValue("thumbnailUrl", meta.thumbnailUrl)}
                />
              )}
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
            <FormField
              control={form.control}
              name="gallery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gallery</FormLabel>
                  <FormDescription>A general product gallery, separate from the legacy images above — shown on the product page image strip.</FormDescription>
                  <MultiImageUploaderWithThumbnails bucket="product-images" value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
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
              <FormField
                control={form.control}
                name="shippingAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping amount (physical products)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Fixed shipping charged once per order line. Digital products are always shipped free.</FormDescription>
                    <FormMessage />
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Legacy variants</h2>
            <p className="text-xs text-foreground/50">
              The older single-option-group model. Still supported for existing products — new products should use Option Groups below instead.
            </p>
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
              <Plus size={14} /> Add legacy variant
            </Button>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Option groups</h2>
                <p className="text-xs text-foreground/50 mt-1">Size, Color, Dimensions, Material — customers can combine several of these in one order.</p>
              </div>
              {hasLegacyVariantsOnly && (
                <Button type="button" variant="outline" size="sm" onClick={convertLegacyVariants}>
                  Convert legacy variants
                </Button>
              )}
            </div>
            {optionGroupsArray.fields.map((groupField, groupIndex) => (
              <OptionGroupEditor
                key={groupField.id}
                form={form}
                groupIndex={groupIndex}
                onRemove={() => optionGroupsArray.remove(groupIndex)}
                onMoveUp={() => optionGroupsArray.move(groupIndex, groupIndex - 1)}
                onMoveDown={() => optionGroupsArray.move(groupIndex, groupIndex + 1)}
                isFirst={groupIndex === 0}
                isLast={groupIndex === optionGroupsArray.fields.length - 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => optionGroupsArray.append({ key: "", label: "", required: true, helpText: null, isActive: true, values: [] })}
            >
              <Plus size={14} /> Add option group
            </Button>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Varieties</h2>
              <p className="text-xs text-foreground/50 mt-1">Pictured, named sub-choices — e.g. Burgundy set / White set / Brown set, each with its own image and description.</p>
            </div>
            {varietiesArray.fields.map((varietyField, varietyIndex) => (
              <VarietyEditor
                key={varietyField.id}
                control={form.control}
                form={form}
                varietyIndex={varietyIndex}
                onRemove={() => varietiesArray.remove(varietyIndex)}
                onMoveUp={() => varietiesArray.move(varietyIndex, varietyIndex - 1)}
                onMoveDown={() => varietiesArray.move(varietyIndex, varietyIndex + 1)}
                isFirst={varietyIndex === 0}
                isLast={varietyIndex === varietiesArray.fields.length - 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                varietiesArray.append({
                  name: "",
                  description: null,
                  sku: null,
                  priceOverride: null,
                  shippingAmountOverride: null,
                  availabilityOverride: null,
                  isActive: true,
                  images: [],
                })
              }
            >
              <Plus size={14} /> Add variety
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
                  <FormLabel>Legacy download URL (unused by order fulfilment)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Superseded by the secure digital file below — kept only for backward compatibility.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="digitalDownloadPath"
              render={({ field }) => <DigitalFileUploader value={field.value} onChange={field.onChange} label="Digital file (delivered after payment)" />}
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
