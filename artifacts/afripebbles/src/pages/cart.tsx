import { Link, useLocation } from "wouter";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";

export default function Cart() {
  const { items, updateQuantity, removeItem } = useCart();
  const [, setLocation] = useLocation();

  const subtotalByCurrency = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.snapshot.currency] = (acc[item.snapshot.currency] ?? 0) + item.snapshot.price * item.quantity;
    return acc;
  }, {});
  const currencies = Object.keys(subtotalByCurrency);

  return (
    <Layout>
      <Seo title="Your Cart" index={false} />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} /> Continue Shopping
        </Link>

        <h1 className="text-3xl md:text-4xl font-serif mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <ShoppingBag className="mx-auto mb-4 text-foreground/30" size={40} />
            <p className="text-foreground/60 mb-6">Your cart is empty.</p>
            <Link href="/shop">
              <Button variant="outline">Browse the Shop</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variant?.label ?? ""}-${item.variant?.option ?? ""}`} className="flex gap-4 border border-border rounded-xl p-4">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.snapshot.imageUrl && <img src={item.snapshot.imageUrl} alt={item.snapshot.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.snapshot.title}</div>
                    {item.variant && (
                      <div className="text-sm text-foreground/60">
                        {item.variant.label}: {item.variant.option}
                      </div>
                    )}
                    <div className="text-sm text-foreground/60">{formatCurrency(item.snapshot.price, item.snapshot.currency)} each</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2 border border-border rounded-full px-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)}
                          className="p-1.5 text-foreground/60 hover:text-primary"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)}
                          className="p-1.5 text-foreground/60 hover:text-primary"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variant)}
                        className="text-xs text-destructive/80 hover:text-destructive inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(item.snapshot.price * item.quantity, item.snapshot.currency)}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6 space-y-2">
              {currencies.map((currency) => (
                <div key={currency} className="flex justify-between text-lg font-medium">
                  <span>Estimated subtotal</span>
                  <span>{formatCurrency(subtotalByCurrency[currency], currency)}</span>
                </div>
              ))}
              <p className="text-xs text-foreground/50">Shipping, discounts, and the final total are calculated at checkout.</p>
            </div>

            <Button size="lg" className="w-full rounded-full h-14 text-lg mt-6" onClick={() => setLocation("/checkout")}>
              Proceed to Checkout
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
