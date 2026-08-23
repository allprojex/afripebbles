import { eq, inArray, asc } from "drizzle-orm";
import {
  db,
  productOptionGroupsTable,
  productOptionValuesTable,
  productVarietiesTable,
  productImagesTable,
  type ProductOptionGroup,
  type ProductOptionValue,
  type ProductVariety,
  type ProductImage,
} from "@workspace/db";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ComposedProductChildren {
  optionGroups: (ProductOptionGroup & { values: ProductOptionValue[] })[];
  varieties: (ProductVariety & { images: ProductImage[] })[];
  gallery: ProductImage[];
}

/** Used for list endpoints, which never render this data — avoids an expensive per-row join. */
export const EMPTY_PRODUCT_CHILDREN: ComposedProductChildren = { optionGroups: [], varieties: [], gallery: [] };

/**
 * Full nested shape for a single product: option groups (with their values,
 * sorted), varieties (with their own images, sorted), and general gallery
 * images (varietyId null). Used by admin/public get-by-id routes and after
 * any write, never by list endpoints.
 */
export async function loadProductChildren(productId: number): Promise<ComposedProductChildren> {
  const groups = await db
    .select()
    .from(productOptionGroupsTable)
    .where(eq(productOptionGroupsTable.productId, productId))
    .orderBy(asc(productOptionGroupsTable.displayOrder));

  const groupIds = groups.map((g) => g.id);
  const values = groupIds.length
    ? await db
        .select()
        .from(productOptionValuesTable)
        .where(inArray(productOptionValuesTable.groupId, groupIds))
        .orderBy(asc(productOptionValuesTable.displayOrder))
    : [];

  const varieties = await db
    .select()
    .from(productVarietiesTable)
    .where(eq(productVarietiesTable.productId, productId))
    .orderBy(asc(productVarietiesTable.displayOrder));

  const images = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, productId))
    .orderBy(asc(productImagesTable.displayOrder));

  const valuesByGroup = new Map<number, ProductOptionValue[]>();
  for (const v of values) {
    const arr = valuesByGroup.get(v.groupId) ?? [];
    arr.push(v);
    valuesByGroup.set(v.groupId, arr);
  }

  const imagesByVariety = new Map<number, ProductImage[]>();
  const gallery: ProductImage[] = [];
  for (const img of images) {
    if (img.varietyId == null) {
      gallery.push(img);
    } else {
      const arr = imagesByVariety.get(img.varietyId) ?? [];
      arr.push(img);
      imagesByVariety.set(img.varietyId, arr);
    }
  }

  return {
    optionGroups: groups.map((g) => ({ ...g, values: valuesByGroup.get(g.id) ?? [] })),
    varieties: varieties.map((v) => ({ ...v, images: imagesByVariety.get(v.id) ?? [] })),
    gallery,
  };
}

export interface ProductImageInput {
  url: string;
  altText?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isFeatured?: boolean;
}

export interface ProductOptionValueInput {
  label: string;
  value: string;
  displayOrder?: number;
  priceAdjustment?: number;
  sku?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductOptionGroupInput {
  key: string;
  label: string;
  displayOrder?: number;
  required?: boolean;
  helpText?: string | null;
  isActive?: boolean;
  values: ProductOptionValueInput[];
}

export interface ProductVarietyInput {
  name: string;
  description?: string | null;
  sku?: string | null;
  priceOverride?: number | null;
  shippingAmountOverride?: number | null;
  availabilityOverride?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  images?: ProductImageInput[];
}

export interface ProductChildrenInput {
  optionGroups?: ProductOptionGroupInput[];
  varieties?: ProductVarietyInput[];
  gallery?: ProductImageInput[];
}

/**
 * Wholesale replace: deletes every product_option_group/product_variety/
 * product_image row for this product and reinserts from the submitted
 * arrays, inside the caller's transaction. Safe because order_items never
 * live-joins back to these tables — every order snapshot is a denormalized
 * copy taken at order-creation time, so ids changing across a save never
 * affects historical orders. Must run within `db.transaction`.
 */
export async function replaceProductChildren(tx: DbTx, productId: number, input: ProductChildrenInput): Promise<void> {
  // Images before varieties/groups, so nothing is left dangling mid-replace.
  await tx.delete(productImagesTable).where(eq(productImagesTable.productId, productId));
  await tx.delete(productVarietiesTable).where(eq(productVarietiesTable.productId, productId));
  await tx.delete(productOptionGroupsTable).where(eq(productOptionGroupsTable.productId, productId)); // cascades product_option_values

  const varietyRows = input.varieties ?? [];
  if (varietyRows.length > 0) {
    const insertedVarieties = await tx
      .insert(productVarietiesTable)
      .values(
        varietyRows.map((v, i) => ({
          productId,
          name: v.name,
          description: v.description ?? null,
          sku: v.sku ?? null,
          priceOverride: v.priceOverride ?? null,
          shippingAmountOverride: v.shippingAmountOverride ?? null,
          availabilityOverride: v.availabilityOverride ?? null,
          displayOrder: v.displayOrder ?? i,
          isActive: v.isActive ?? true,
        })),
      )
      .returning({ id: productVarietiesTable.id });

    const varietyImageRows = varietyRows.flatMap((v, i) =>
      (v.images ?? []).map((img, j) => ({
        productId,
        varietyId: insertedVarieties[i].id,
        url: img.url,
        altText: img.altText ?? null,
        caption: img.caption ?? null,
        displayOrder: img.displayOrder ?? j,
        isFeatured: img.isFeatured ?? false,
      })),
    );
    if (varietyImageRows.length > 0) await tx.insert(productImagesTable).values(varietyImageRows);
  }

  const galleryRows = input.gallery ?? [];
  if (galleryRows.length > 0) {
    await tx.insert(productImagesTable).values(
      galleryRows.map((img, i) => ({
        productId,
        varietyId: null,
        url: img.url,
        altText: img.altText ?? null,
        caption: img.caption ?? null,
        displayOrder: img.displayOrder ?? i,
        isFeatured: img.isFeatured ?? false,
      })),
    );
  }

  const groupRows = input.optionGroups ?? [];
  if (groupRows.length > 0) {
    const insertedGroups = await tx
      .insert(productOptionGroupsTable)
      .values(
        groupRows.map((g, i) => ({
          productId,
          key: g.key,
          label: g.label,
          displayOrder: g.displayOrder ?? i,
          required: g.required ?? true,
          helpText: g.helpText ?? null,
          isActive: g.isActive ?? true,
        })),
      )
      .returning({ id: productOptionGroupsTable.id });

    const valueRows = groupRows.flatMap((g, i) =>
      g.values.map((v, j) => ({
        groupId: insertedGroups[i].id,
        label: v.label,
        value: v.value,
        displayOrder: v.displayOrder ?? j,
        priceAdjustment: v.priceAdjustment ?? 0,
        sku: v.sku ?? null,
        imageUrl: v.imageUrl ?? null,
        description: v.description ?? null,
        isActive: v.isActive ?? true,
      })),
    );
    if (valueRows.length > 0) await tx.insert(productOptionValuesTable).values(valueRows);
  }
}

/** Every image URL a product's children (varieties + gallery + option values) currently reference — for the imageCleanup before/after diff. */
export function collectChildImageUrls(children: ComposedProductChildren): string[] {
  const urls: string[] = [];
  for (const g of children.optionGroups) for (const v of g.values) if (v.imageUrl) urls.push(v.imageUrl);
  for (const img of children.gallery) urls.push(img.url);
  for (const variety of children.varieties) for (const img of variety.images) urls.push(img.url);
  return urls;
}
