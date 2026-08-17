import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Download, Clock, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AVAILABILITY_LABEL, isOrderable } from "@/lib/product";
import type { ProductAvailability } from "@workspace/api-client-react";
import { siteConfig } from "@/content/site";
import { format } from "date-fns";

/**
 * Minimal shape this view actually renders — deliberately not the generated
 * Product/PublicProduct type, so both the public product response and the
 * admin (draft-preview) response satisfy it structurally with no casting.
 * Never reads downloadUrl.
 */
export interface ProductDetailViewProduct {
  title: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  currency: string;
  type: string;
  category: string | null;
  imageUrl: string | null;
  previewImageUrl: string | null;
  availability: ProductAvailability;
  preorderOpensAt: string | null;
  preorderClosesAt: string | null;
  estimatedFulfilment: string | null;
  regions: string[];
  variants: { label: string; options: string[] }[];
  externalPurchaseUrl: string | null;
  tags: string[];
}

export function ProductDetailView({ product, backHref = "/shop" }: { product: ProductDetailViewProduct; backHref?: string }) {
  const orderable = isOrderable(product.availability);
  const enquiryHref = `/contact?inquiryType=product&subject=${encodeURIComponent(product.title)}`;

  let ctaLabel = "Enquire About This Product";
  if (product.availability === "preorder") ctaLabel = "Join the Pre-order List";
  else if (product.availability === "coming_soon") ctaLabel = "Notify Me When Available";
  else if (product.availability === "out_of_stock") ctaLabel = "Ask About Restocking";
  else if (product.type === "digital") ctaLabel = "Enquire to Purchase";

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
          className="w-full md:w-1/2"
        >
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted shadow-lg sticky top-32 relative">
            {(product.previewImageUrl || product.imageUrl) && (
              <img
                src={product.previewImageUrl || product.imageUrl || undefined}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-6 left-6 bg-background/90 backdrop-blur-sm text-sm px-4 py-1.5 rounded-full text-primary z-10 font-medium tracking-wide shadow-sm border border-primary/10">
              {AVAILABILITY_LABEL[product.availability]}
            </div>
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

          <div className="text-2xl font-medium mb-8">
            {product.currency} {product.price.toFixed(2)}
          </div>

          <Separator className="mb-8" />

          <div className="prose prose-stone text-foreground/80 font-sans leading-relaxed mb-10">
            <p className="whitespace-pre-wrap">{product.description}</p>
          </div>

          {product.variants.length > 0 && (
            <div className="mb-8 space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.label}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">{variant.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option) => (
                      <span key={option} className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground/70">
                        {option}
                      </span>
                    ))}
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
                This is a digital product delivered by download. Direct checkout isn't connected on this website yet — use the button below to enquire and we'll follow up with purchase details.
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
            ) : (
              <Link href={enquiryHref}>
                <Button
                  size="lg"
                  className="w-full rounded-full h-14 text-lg gap-2"
                  disabled={!orderable && product.availability !== "coming_soon" && product.availability !== "out_of_stock"}
                >
                  <MessageCircle size={20} />
                  {ctaLabel}
                </Button>
              </Link>
            )}
            <p className="text-xs text-center text-foreground/50 mt-4">
              {product.externalPurchaseUrl
                ? "You'll be taken to an external site to complete this purchase."
                : "Online checkout isn't connected yet — this sends your enquiry directly to AfriPebbles."}
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
