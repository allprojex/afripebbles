import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { cartLineImageUrl, handleImageError, primaryVarietyImage } from "@/lib/product";
import type { ProductOptionGroup, ProductVariety } from "@workspace/api-client-react";

interface PendingLine {
  key: string;
  varietyId: number | null;
  varietyName: string | null;
  selections: { groupId: number; valueId: number; groupLabel: string; valueLabel: string; priceAdjustment: number }[];
  quantity: number;
  unitPrice: number;
  /** Resolved when the line is staged, so the cart row shows the variety the customer actually picked. */
  imageUrl: string | null;
}

interface ProductSelectorProps {
  productId: number;
  productTitle: string;
  basePrice: number;
  currency: string;
  productType: "digital" | "physical" | string;
  fallbackImageUrl: string | null;
  optionGroups: ProductOptionGroup[];
  varieties: ProductVariety[];
  onVarietyChange?: (variety: ProductVariety | null) => void;
}

function pendingKey(varietyId: number | null, selections: PendingLine["selections"]): string {
  const selKey = selections
    .map((s) => `${s.groupId}:${s.valueId}`)
    .sort()
    .join(",");
  return `${varietyId ?? ""}::${selKey}`;
}

export function ProductSelector({
  productId,
  productTitle,
  basePrice,
  currency,
  productType,
  fallbackImageUrl,
  optionGroups,
  varieties,
  onVarietyChange,
}: ProductSelectorProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const activeGroups = optionGroups.filter((g) => g.isActive);
  const activeVarieties = varieties.filter((v) => v.isActive);

  const [selectedVarietyId, setSelectedVarietyId] = useState<number | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState<PendingLine[]>([]);

  const selectedVariety = activeVarieties.find((v) => v.id === selectedVarietyId) ?? null;

  const requiredGroupsMissing = activeGroups.filter((g) => g.required).some((g) => selections[g.id] === undefined);
  const varietyMissing = activeVarieties.length > 0 && selectedVarietyId === null;
  const canStage = !requiredGroupsMissing && !varietyMissing;

  function currentSelectionDetails(): PendingLine["selections"] {
    const details: PendingLine["selections"] = [];
    for (const group of activeGroups) {
      const valueId = selections[group.id];
      if (valueId === undefined) continue;
      const value = group.values.find((v) => v.id === valueId && v.isActive);
      if (!value) continue;
      details.push({ groupId: group.id, valueId, groupLabel: group.label, valueLabel: value.label, priceAdjustment: value.priceAdjustment });
    }
    return details;
  }

  const currentDetails = currentSelectionDetails();
  const currentAdjustment = currentDetails.reduce((sum, d) => sum + d.priceAdjustment, 0);
  const currentUnitPrice = (selectedVariety?.priceOverride ?? basePrice) + currentAdjustment;

  function selectVariety(variety: ProductVariety) {
    setSelectedVarietyId(variety.id);
    onVarietyChange?.(variety);
  }

  function resetPickers() {
    setSelectedVarietyId(null);
    setSelections({});
    setQuantity(1);
    onVarietyChange?.(null);
  }

  function handleAddSelection() {
    if (!canStage) return;
    const details = currentSelectionDetails();
    const key = pendingKey(selectedVarietyId, details);
    setPending((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity + quantity } : p));
      }
      return [
        ...prev,
        {
          key,
          varietyId: selectedVarietyId,
          varietyName: selectedVariety?.name ?? null,
          selections: details,
          quantity,
          unitPrice: currentUnitPrice,
          imageUrl: cartLineImageUrl(selectedVariety, fallbackImageUrl),
        },
      ];
    });
    resetPickers();
  }

  function removePending(key: string) {
    setPending((prev) => prev.filter((p) => p.key !== key));
  }

  function handleAddAllToCart() {
    if (pending.length === 0) return;
    for (const line of pending) {
      addItem({
        productId,
        quantity: line.quantity,
        variant: null,
        varietyId: line.varietyId,
        varietyName: line.varietyName,
        selections: line.selections,
        snapshot: {
          title: productTitle,
          price: line.unitPrice,
          currency,
          imageUrl: line.imageUrl,
          type: productType === "digital" ? "digital" : "physical",
        },
      });
    }
    toast({ title: "Added to cart", description: `${pending.length} combination${pending.length > 1 ? "s" : ""} added.` });
    setPending([]);
  }

  return (
    <div className="space-y-6">
      {activeVarieties.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">Style</div>
          <div className="grid grid-cols-3 gap-2">
            {activeVarieties.map((variety) => {
              const image = primaryVarietyImage(variety);
              const isSelected = selectedVarietyId === variety.id;
              return (
                <button
                  key={variety.id}
                  type="button"
                  onClick={() => selectVariety(variety)}
                  className={`text-left rounded-xl border overflow-hidden transition-colors ${
                    isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="aspect-square bg-muted">
                    {image && (
                      <img
                        src={image.thumbnailUrl ?? image.url}
                        alt={image.altText ?? variety.name}
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="px-2 py-1.5 text-xs font-medium truncate">{variety.name}</div>
                </button>
              );
            })}
          </div>
          {selectedVariety?.description && <p className="mt-2 text-sm text-foreground/70">{selectedVariety.description}</p>}
        </div>
      )}

      {activeGroups.map((group) => (
        <div key={group.id}>
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
            {group.label}
            {!group.required && <span className="normal-case font-normal text-foreground/40"> (optional)</span>}
          </div>
          {group.helpText && <p className="text-xs text-foreground/50 mb-2">{group.helpText}</p>}
          <div className="flex flex-wrap gap-2">
            {group.values
              .filter((v) => v.isActive)
              .map((value) => {
                const isSelected = selections[group.id] === value.id;
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => setSelections((prev) => ({ ...prev, [group.id]: value.id }))}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      isSelected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-foreground/70 hover:border-primary/50"
                    }`}
                  >
                    {value.label}
                    {value.priceAdjustment !== 0 && (
                      <span className="ml-1 text-xs opacity-70">
                        ({value.priceAdjustment > 0 ? "+" : ""}
                        {formatCurrency(value.priceAdjustment, currency)})
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Quantity</span>
          <div className="flex items-center gap-3 border border-border rounded-full px-2">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-2 text-foreground/60 hover:text-primary">
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-medium">{quantity}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)} className="p-2 text-foreground/60 hover:text-primary">
              <Plus size={14} />
            </button>
          </div>
          <span className="text-sm text-foreground/60">{formatCurrency(currentUnitPrice, currency)} each</span>
        </div>
        <Button type="button" variant="outline" className="w-full rounded-full" disabled={!canStage} onClick={handleAddSelection}>
          Add selection
        </Button>
        {!canStage && (
          <p className="text-xs text-center text-destructive">
            {varietyMissing ? "Choose a style above" : "Choose all required options above"} to continue.
          </p>
        )}
      </div>

      {pending.length > 0 && (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Your selections</div>
          {pending.map((line) => (
            <div key={line.key} className="flex items-start justify-between gap-2 text-sm">
              <div>
                {line.varietyName && <div className="font-medium">{line.varietyName}</div>}
                {line.selections.map((s) => (
                  <div key={s.groupId} className="text-foreground/60">
                    {s.groupLabel}: {s.valueLabel}
                  </div>
                ))}
                <div className="text-foreground/60">Qty: {line.quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(line.unitPrice * line.quantity, currency)}</span>
                <button type="button" aria-label="Remove selection" onClick={() => removePending(line.key)} className="text-foreground/40 hover:text-destructive">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <Button type="button" size="lg" className="w-full rounded-full h-12" onClick={handleAddAllToCart}>
            Add all to cart
          </Button>
        </div>
      )}
    </div>
  );
}
