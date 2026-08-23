import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItemVariant {
  label: string;
  option: string;
}

export interface CartItemSelection {
  groupId: number;
  valueId: number;
  groupLabel: string;
  valueLabel: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
  /** Legacy single-option-group path — only used by products with no option groups/varieties. */
  variant: CartItemVariant | null;
  /** New multi-option-group/variety path. Both stay optional/undefined for legacy and simple products. */
  varietyId?: number | null;
  varietyName?: string | null;
  selections?: CartItemSelection[];
  // Cached only for display before the cart page re-fetches current data —
  // never trusted for pricing. Final totals always come from the server.
  snapshot: {
    title: string;
    price: number;
    currency: string;
    imageUrl: string | null;
    type: "digital" | "physical";
  };
}

const STORAGE_KEY = "afripebbles_cart_v1";

/**
 * Combination identity for merging: same product + same variety + same set
 * of option-value selections (order-independent) merges quantity; anything
 * different becomes its own line. Falls back to the legacy variant pair for
 * products still using the single-option-group model.
 */
function lineKey(item: Pick<CartItem, "productId" | "variant" | "varietyId" | "selections">): string {
  const selectionsKey = (item.selections ?? [])
    .map((s) => `${s.groupId}:${s.valueId}`)
    .sort()
    .join(",");
  const legacyKey = item.variant ? `${item.variant.label}:${item.variant.option}` : "";
  return `${item.productId}::${item.varietyId ?? ""}::${selectionsKey}::${legacyKey}`;
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type CartLineIdentity = Pick<CartItem, "productId" | "variant" | "varietyId" | "selections">;

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (line: CartLineIdentity) => void;
  updateQuantity: (line: CartLineIdentity, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const key = lineKey(item);
      const existing = prev.find((i) => lineKey(i) === key);
      if (existing) {
        return prev.map((i) => (lineKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return [...prev, item];
    });
  };

  const removeItem = (line: CartLineIdentity) => {
    const key = lineKey(line);
    setItems((prev) => prev.filter((i) => lineKey(i) !== key));
  };

  const updateQuantity = (line: CartLineIdentity, quantity: number) => {
    const key = lineKey(line);
    setItems((prev) => (quantity < 1 ? prev.filter((i) => lineKey(i) !== key) : prev.map((i) => (lineKey(i) === key ? { ...i, quantity } : i))));
  };

  const clear = () => setItems([]);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return <CartContext.Provider value={{ items, itemCount, addItem, removeItem, updateQuantity, clear }}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
