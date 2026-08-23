import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart, type CartItem } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useQuoteOrder, useCreateOrder, ApiError, type PaymentMethod } from "@workspace/api-client-react";
import { describeOrderItem } from "@/lib/orderItemDisplay";

function cartLineReactKey(item: CartItem): string {
  const selectionsKey = (item.selections ?? [])
    .map((s) => `${s.groupId}:${s.valueId}`)
    .sort()
    .join(",");
  return `${item.productId}-${item.varietyId ?? ""}-${selectionsKey}-${item.variant?.label ?? ""}-${item.variant?.option ?? ""}`;
}

const ORDER_STORAGE_KEY = "afripebbles_last_order";

export default function Checkout() {
  const { items, clear } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [country, setCountry] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [couponCode, setCouponCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const quoteMutation = useQuoteOrder();
  const createOrderMutation = useCreateOrder();

  const cartPayloadItems = items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    variant: i.variant,
    varietyId: i.varietyId ?? null,
    selections: (i.selections ?? []).map((s) => ({ groupId: s.groupId, valueId: s.valueId })),
  }));
  const hasPhysicalItem = items.some((i) => i.snapshot.type === "physical");

  useEffect(() => {
    if (items.length === 0) return;
    quoteMutation.mutate({ data: { items: cartPayloadItems, couponCode: couponCode || null } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cartPayloadItems)]);

  const applyCoupon = () => {
    if (items.length === 0) return;
    quoteMutation.mutate({ data: { items: cartPayloadItems, couponCode: couponCode || null } });
  };

  if (items.length === 0) {
    return (
      <Layout>
        <Seo title="Checkout" index={false} />
        <div className="container mx-auto px-4 py-16 max-w-xl text-center">
          <p className="text-foreground/60 mb-6">Your cart is empty — add something from the shop before checking out.</p>
          <Link href="/shop">
            <Button variant="outline">Browse the Shop</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const quote = quoteMutation.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!consent) {
      setFormError("Please accept the terms to place your order.");
      return;
    }
    if (hasPhysicalItem && !deliveryAddress.trim()) {
      setFormError("A delivery address is required for physical items in your cart.");
      return;
    }

    createOrderMutation.mutate(
      {
        data: {
          customerName,
          customerEmail,
          customerPhone,
          country,
          deliveryAddress: hasPhysicalItem ? deliveryAddress : null,
          notes: notes || null,
          paymentMethod,
          couponCode: couponCode || null,
          items: cartPayloadItems,
          consent,
        },
      },
      {
        onSuccess: (order) => {
          sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
          clear();
          setLocation("/order-confirmation");
        },
        onError: (err) => {
          setFormError(err instanceof ApiError && err.data && typeof err.data === "object" && "error" in err.data ? String((err.data as { error: string }).error) : "Couldn't place your order. Please try again.");
        },
      },
    );
  };

  return (
    <Layout>
      <Seo title="Checkout" index={false} />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Cart
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif mb-8">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-12">
          <form onSubmit={handleSubmit} className="flex-1 space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-name" className="text-sm font-medium mb-1.5 block">
                  Full name
                </label>
                <Input id="checkout-name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="checkout-email" className="text-sm font-medium mb-1.5 block">
                  Email
                </label>
                <Input id="checkout-email" required type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="checkout-phone" className="text-sm font-medium mb-1.5 block">
                  Phone
                </label>
                <Input id="checkout-phone" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="checkout-country" className="text-sm font-medium mb-1.5 block">
                  Country
                </label>
                <Input id="checkout-country" required value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>

            {hasPhysicalItem && (
              <div>
                <label htmlFor="checkout-address" className="text-sm font-medium mb-1.5 block">
                  Delivery address
                </label>
                <Textarea id="checkout-address" required value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>
            )}

            <div>
              <label htmlFor="checkout-notes" className="text-sm font-medium mb-1.5 block">
                Order notes (optional)
              </label>
              <Textarea id="checkout-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div>
              <label htmlFor="checkout-payment-method" className="text-sm font-medium mb-1.5 block">
                Payment method
              </label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-foreground/50 mt-1.5">
                Payment is completed after your order is placed — you'll see instructions and can reach us on WhatsApp to confirm.
              </p>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Coupon code (optional)" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
              <Button type="button" variant="outline" onClick={applyCoupon} disabled={quoteMutation.isPending}>
                Apply
              </Button>
            </div>
            {quoteMutation.isError && (
              <p className="text-sm text-destructive">
                {quoteMutation.error instanceof ApiError && quoteMutation.error.data && typeof quoteMutation.error.data === "object" && "error" in quoteMutation.error.data
                  ? String((quoteMutation.error.data as { error: string }).error)
                  : "Couldn't calculate your total. Please review your cart."}
              </p>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                aria-label="I agree to the Terms and Privacy Policy"
                className="mt-1"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" size="lg" className="w-full rounded-full h-14 text-lg" disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending ? "Placing order…" : "Place Order"}
            </Button>
          </form>

          <div className="w-full lg:w-80 shrink-0">
            <div className="border border-border rounded-2xl p-6 sticky top-32">
              <h2 className="font-serif text-xl mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={cartLineReactKey(item)} className="flex justify-between text-sm">
                    <span className="text-foreground/70">
                      {item.snapshot.title}
                      {describeOrderItem(item).length > 0 && ` (${describeOrderItem(item).join(", ")})`} × {item.quantity}
                    </span>
                    <span>{formatCurrency(item.snapshot.price * item.quantity, item.snapshot.currency)}</span>
                  </div>
                ))}
              </div>
              {quote ? (
                <div className="border-t border-border pt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{formatCurrency(quote.shippingTotal, quote.currency)}</span>
                  </div>
                  {quote.discountTotal > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Discount</span>
                      <span>-{formatCurrency(quote.discountTotal, quote.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-medium pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(quote.grandTotal, quote.currency)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-foreground/50">Calculating final total…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
