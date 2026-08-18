import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItemVariant {
  label: string;
  option: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
  variant: CartItemVariant | null;
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

function lineKey(productId: number, variant: CartItemVariant | null): string {
  return `${productId}::${variant?.label ?? ""}::${variant?.option ?? ""}`;
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

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, variant: CartItemVariant | null) => void;
  updateQuantity: (productId: number, variant: CartItemVariant | null, quantity: number) => void;
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
      const key = lineKey(item.productId, item.variant);
      const existing = prev.find((i) => lineKey(i.productId, i.variant) === key);
      if (existing) {
        return prev.map((i) => (lineKey(i.productId, i.variant) === key ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return [...prev, item];
    });
  };

  const removeItem = (productId: number, variant: CartItemVariant | null) => {
    const key = lineKey(productId, variant);
    setItems((prev) => prev.filter((i) => lineKey(i.productId, i.variant) !== key));
  };

  const updateQuantity = (productId: number, variant: CartItemVariant | null, quantity: number) => {
    const key = lineKey(productId, variant);
    setItems((prev) =>
      quantity < 1
        ? prev.filter((i) => lineKey(i.productId, i.variant) !== key)
        : prev.map((i) => (lineKey(i.productId, i.variant) === key ? { ...i, quantity } : i)),
    );
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
