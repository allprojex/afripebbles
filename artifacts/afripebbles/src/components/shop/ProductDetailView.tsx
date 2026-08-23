import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Download, Clock, MapPin, MessageCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AVAILABILITY_LABEL, isOrderable } from "@/lib/product";
import { formatCurrency } from "@/lib/currency";
import { useCart, type CartItemVariant } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import type { ProductAvailability, ProductOptionGroup, ProductVariety, ProductImage } from "@workspace/api-client-react";
import { siteConfig } from "@/content/site";
import { format } from "date-fns";
import { ProductSelector } from "./ProductSelector";
import { handleImageError } from "@/lib/product";

/**
 * Minimal shape this view actually renders — deliberately not the generated
 * Product/PublicProduct type, so both the public product response and the
 * admin (draft-preview) response satisfy it structurally with no casting.
 * Never reads downloadUrl/digitalDownloadPath.
 */
export interface ProductDetailViewProduct {
  id: number;
  title: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  currency: string;
  type: string;
  category: string | null;
  imageUrl: string | null;
  thumbnailUrl?: string | null;
  previewImageUrl: string | null;
  availability: ProductAvailability;
  preorderOpensAt: string | null;
  preorderClosesAt: string | null;
  estimatedFulfilment: string | null;
  regions: string[];
  variants: { label: string; options: string[] }[];
  optionGroups?: ProductOptionGroup[];
  varieties?: ProductVariety[];
  gallery?: ProductImage[];
  externalPurchaseUrl: string | null;
  tags: string[];
}

function isPreorderWindowOpen(product: ProductDetailViewProduct): boolean {
  const now = Date.now();
  if (product.preorderOpensAt && now < new Date(product.preorderOpensAt).getTime()) return false;
  if (product.preorderClosesAt && now > new Date(product.preorderClosesAt).getTime()) return false;
  return true;
}

export function ProductDetailView({ product, backHref = "/shop" }: { product: ProductDetailViewProduct; backHref?: string }) {
  const orderable = isOrderable(product.availability);
  const enquiryHref = `/contact?inquiryType=product&subject=${encodeURIComponent(product.title)}`;
  const { addItem } = useCart();
  const { toast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<CartItemVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  const usesNewModel = (product.optionGroups?.length ?? 0) > 0 || (product.varieties?.length ?? 0) > 0;
  const defaultImage = product.previewImageUrl || product.imageUrl;
  const [activeImage, setActiveImage] = useState<string | null>(defaultImage);
  const galleryCaptionByUrl = new Map((product.gallery ?? []).map((img) => [img.url, img.caption ?? null] as const));
  const rawThumbnails: { url: string; thumbnailUrl: string | null; caption: string | null }[] = [
    product.imageUrl
      ? { url: product.imageUrl, thumbnailUrl: product.thumbnailUrl ?? null, caption: galleryCaptionByUrl.get(product.imageUrl) ?? null }
      : null,
    product.previewImageUrl ? { url: product.previewImageUrl, thumbnailUrl: null, caption: null } : null,
    ...(product.gallery ?? []).map((img) => ({ url: img.url, thumbnailUrl: img.thumbnailUrl ?? null, caption: img.caption ?? null })),
  ].filter((t): t is { url: string; thumbnailUrl: string | null; caption: string | null } => t !== null);
  const seenUrls = new Set<string>();
  const thumbnails = rawThumbnails.filter((t) => (seenUrls.has(t.url) ? false : (seenUrls.add(t.url), true)));
  const handleVarietyChange = (variety: ProductVariety | null) => {
    if (!variety) {
      setActiveImage(defaultImage);
      return;
    }
    const varietyImage = variety.images.find((img) => img.isFeatured) ?? variety.images[0];
    setActiveImage(varietyImage?.url ?? defaultImage);
  };

  const requiresVariant = product.variants.length > 0;
  const variantSelected = !requiresVariant || selectedVariant !== null;
  const preorderWindowOpen = product.availability !== "preorder" || isPreorderWindowOpen(product);
  const canAddToCart = orderable && !product.externalPurchaseUrl && variantSelected && preorderWindowOpen;

  let ctaLabel = "Enquire About This Product";
  if (product.availability === "preorder") ctaLabel = "Join the Pre-order List";
  else if (product.availability === "coming_soon") ctaLabel = "Notify Me When Available";
  else if (product.availability === "out_of_stock") ctaLabel = "Ask About Restocking";
  else if (product.type === "digital") ctaLabel = "Enquire to Purchase";

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      quantity,
      variant: selectedVariant,
      snapshot: {
        title: product.title,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        type: product.type === "digital" ? "digital" : "physical",
      },
    });
    toast({ title: "Added to cart", description: `${product.title}${selectedVariant ? ` (${selectedVariant.option})` : ""} — quantity ${quantity}` });
    setQuantity(1);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors mb-8">
        <ArrowLeft size={16} /> Back to Shop
      </Link>

      <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full md:w-1/2 self-start"
        >
          <div className="sticky top-32 space-y-4">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted shadow-lg relative">
              {activeImage && (
                <img
                  src={activeImage}
                  alt={product.title}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-6 left-6 bg-background/90 backdrop-blur-sm text-sm px-4 py-1.5 rounded-full text-primary z-10 font-medium tracking-wide shadow-sm border border-primary/10">
                {AVAILABILITY_LABEL[product.availability]}
              </div>
            </div>
            {thumbnails.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {thumbnails.map((t) => (
                  <button
                    key={t.url}
                    type="button"
                    onClick={() => setActiveImage(t.url)}
                    className={`text-left rounded-xl border overflow-hidden transition-colors ${
                      activeImage === t.url ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="aspect-square bg-muted">
                      <img src={t.thumbnailUrl ?? t.url} alt="" loading="lazy" decoding="async" onError={handleImageError} className="w-full h-full object-cover" />
                    </div>
                    {t.caption && <div className="px-2 py-1.5 text-xs font-medium truncate">{t.caption}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full md:w-1/2 flex flex-col pt-4 md:pt-10"
        >
          <div className="mb-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            <span>{product.type === "digital" ? "Digital Product" : "Physical Product"}</span>
            {product.category && (
              <>
                <span className="w-1 h-1 rounded-full bg-foreground/30" />
                <span>{product.category}</span>
              </>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-4">{product.title}</h1>

          <div className="text-2xl font-medium mb-8">{formatCurrency(product.price, product.currency)}</div>

          <Separator className="mb-8" />

          <div className="prose prose-stone text-foreground/80 font-sans leading-relaxed mb-10">
            <p className="whitespace-pre-wrap">{product.description}</p>
          </div>

          {!usesNewModel && product.variants.length > 0 && (
            <div className="mb-8 space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.label}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">{variant.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option) => {
                      const isSelected = selectedVariant?.label === variant.label && selectedVariant?.option === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedVariant({ label: variant.label, option })}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            isSelected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-foreground/70 hover:border-primary/50"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {product.type === "digital" && product.availability === "available" && (
            <div className="flex items-start gap-3 bg-secondary/20 p-4 rounded-xl mb-6 border border-secondary/30">
              <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                <strong className="font-medium text-foreground block mb-1">Digital Delivery</strong>
                Delivered by download once your order is confirmed as paid.
              </p>
            </div>
          )}

          {product.availability === "preorder" && (
            <div className="flex items-start gap-3 bg-primary/5 p-4 rounded-xl mb-6 border border-primary/20">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/80 space-y-1">
                <strong className="font-medium text-foreground block mb-1">Pre-order Item</strong>
                {product.preorderOpensAt && <p>Ordering opens {format(new Date(product.preorderOpensAt), "MMMM d, yyyy")}.</p>}
                {product.preorderClosesAt && <p>Ordering closes {format(new Date(product.preorderClosesAt), "MMMM d, yyyy")}.</p>}
                <p>
                  {product.estimatedFulfilment ??
                    `Estimated fulfilment is ${siteConfig.shop.preorderFulfilmentWindow}. ${siteConfig.shop.preorderClosingGuidance}`}
                </p>
                {!preorderWindowOpen && <p className="font-medium text-destructive">Pre-orders aren't open right now.</p>}
              </div>
            </div>
          )}

          {product.availability === "coming_soon" && (
            <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-xl mb-6 border border-border">
              <Clock className="w-5 h-5 text-foreground/60 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                <strong className="font-medium text-foreground block mb-1">Coming Soon</strong>
                This product isn't orderable yet. Reach out to be notified when it's available.
              </p>
            </div>
          )}

          {product.availability === "out_of_stock" && (
            <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-xl mb-6 border border-border">
              <ShoppingBag className="w-5 h-5 text-foreground/60 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                <strong className="font-medium text-foreground block mb-1">Out of Stock</strong>
                This product is temporarily unavailable. Reach out and we'll let you know if it's restocked.
              </p>
            </div>
          )}

          {product.regions.length > 0 && (
            <div className="flex items-start gap-3 mb-8 text-sm text-foreground/60">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Ships to: {product.regions.join(", ")}</span>
            </div>
          )}

          <div className="mt-auto pt-4">
            {product.externalPurchaseUrl ? (
              <a href={product.externalPurchaseUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full rounded-full h-14 text-lg gap-2">
                  <ShoppingBag size={20} /> Purchase
                </Button>
              </a>
            ) : orderable && usesNewModel ? (
              <ProductSelector
                productId={product.id}
                productTitle={product.title}
                basePrice={product.price}
                currency={product.currency}
                productType={product.type}
                fallbackImageUrl={product.imageUrl}
                optionGroups={product.optionGroups ?? []}
                varieties={product.varieties ?? []}
                onVarietyChange={handleVarietyChange}
              />
            ) : orderable ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Quantity</span>
                  <div className="flex items-center gap-3 border border-border rounded-full px-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 text-foreground/60 hover:text-primary"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="p-2 text-foreground/60 hover:text-primary"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <Button size="lg" className="w-full rounded-full h-14 text-lg gap-2" disabled={!canAddToCart} onClick={handleAddToCart}>
                  <ShoppingBag size={20} />
                  {product.availability === "preorder" ? "Add Pre-order to Cart" : "Add to Cart"}
                </Button>
                {requiresVariant && !variantSelected && <p className="text-xs text-center text-destructive">Choose an option above to continue.</p>}
              </div>
            ) : (
              <Link href={enquiryHref}>
                <Button size="lg" className="w-full rounded-full h-14 text-lg gap-2">
                  <MessageCircle size={20} />
                  {ctaLabel}
                </Button>
              </Link>
            )}
            <p className="text-xs text-center text-foreground/50 mt-4">
              {product.externalPurchaseUrl
                ? "You'll be taken to an external site to complete this purchase."
                : orderable
                  ? "Payment is completed via PayPal, Mobile Money, or bank transfer after checkout."
                  : "This sends your enquiry directly to AfriPebbles."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags &&
                product.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-muted/50 rounded-full text-xs text-foreground/60">
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
