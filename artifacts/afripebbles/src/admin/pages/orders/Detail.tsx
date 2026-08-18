import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, MessageCircle } from "lucide-react";
import {
  useAdminGetOrder,
  useAdminUpdateOrder,
  useGetSiteSettings,
  type PaymentStatus,
  type OrderStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency } from "@/lib/currency";
import { buildWhatsAppOrderLink, resolveCommerceWhatsappNumber } from "@/lib/whatsapp";

export default function AdminOrderDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, refetch } = useAdminGetOrder(id);
  const { data: settings } = useGetSiteSettings();
  const updateMutation = useAdminUpdateOrder();
  const { toast } = useToast();

  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [statusChangeNote, setStatusChangeNote] = useState("");

  if (isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;
  if (!data) return <p className="text-foreground/60">Order not found.</p>;

  const { order, history } = data;
  const whatsappNumber = resolveCommerceWhatsappNumber(settings);
  const whatsappLink = whatsappNumber ? buildWhatsAppOrderLink(order, whatsappNumber) : null;

  const updateField = (field: "paymentStatus" | "orderStatus", value: PaymentStatus | OrderStatus) => {
    updateMutation.mutate(
      { id: order.id, data: { [field]: value, statusChangeNote: statusChangeNote || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Order updated" });
          setStatusChangeNote("");
          refetch();
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't update the order" }),
      },
    );
  };

  const saveDetails = () => {
    updateMutation.mutate(
      {
        id: order.id,
        data: {
          trackingNumber: trackingNumber ?? order.trackingNumber,
          internalNotes: internalNotes ?? order.internalNotes,
          paymentNote: paymentNote ?? order.paymentNote,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Order updated" });
          setTrackingNumber(null);
          setInternalNotes(null);
          setPaymentNote(null);
          refetch();
        },
        onError: () => toast({ variant: "destructive", title: "Couldn't update the order" }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary mb-2">
        <ArrowLeft size={14} /> Orders
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-serif font-mono">{order.orderReference}</h1>
        {whatsappLink ? (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <MessageCircle size={16} /> Open in WhatsApp
            </Button>
          </a>
        ) : (
          <p className="text-xs text-foreground/50">Set a commerce WhatsApp number in Site Settings to enable this.</p>
        )}
      </div>

      <section className="border border-border rounded-2xl p-6 space-y-2 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-3">Customer</h2>
        <p>
          <span className="text-foreground/50">Name:</span> {order.customerName}
        </p>
        <p>
          <span className="text-foreground/50">Email:</span> {order.customerEmail}
        </p>
        <p>
          <span className="text-foreground/50">Phone:</span> {order.customerPhone}
        </p>
        <p>
          <span className="text-foreground/50">Country:</span> {order.country}
        </p>
        {order.deliveryAddress && (
          <p>
            <span className="text-foreground/50">Delivery Address:</span> {order.deliveryAddress}
          </p>
        )}
        {order.notes && (
          <p>
            <span className="text-foreground/50">Customer Notes:</span> {order.notes}
          </p>
        )}
      </section>

      <section className="border border-border rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-3">Items</h2>
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
            <div>
              <div>
                {item.productName}
                {item.variant ? ` (${item.variant.label}: ${item.variant.option})` : ""} × {item.quantity}
              </div>
              {item.isPreorder && <div className="text-xs text-primary">Pre-order{item.preorderFulfilmentText ? ` — ${item.preorderFulfilmentText}` : ""}</div>}
            </div>
            <div>{formatCurrency(item.lineTotal, order.currency)}</div>
          </div>
        ))}
        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(order.shippingTotal, order.currency)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
              <span>-{formatCurrency(order.discountTotal, order.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-base">
            <span>Total</span>
            <span>{formatCurrency(order.grandTotal, order.currency)}</span>
          </div>
        </div>
      </section>

      <section className="border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Payment &amp; Fulfilment</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment method</label>
            <p className="text-sm">{order.paymentMethod}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment status</label>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.paymentStatus} />
              <Select value={order.paymentStatus} onValueChange={(v) => updateField("paymentStatus", v as PaymentStatus)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {order.paidAt && <p className="text-xs text-foreground/50 mt-1">Paid at {new Date(order.paidAt).toLocaleString()}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Order status</label>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.orderStatus} />
              <Select value={order.orderStatus} onValueChange={(v) => updateField("orderStatus", v as OrderStatus)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Status change note (optional, applies to next change)</label>
            <Input value={statusChangeNote} onChange={(e) => setStatusChangeNote(e.target.value)} placeholder="e.g. Confirmed via MoMo receipt" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment note / reference</label>
            <Input
              value={paymentNote ?? order.paymentNote ?? ""}
              onChange={(e) => setPaymentNote(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tracking number</label>
            <Input value={trackingNumber ?? order.trackingNumber ?? ""} onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Internal notes (never shown to the customer)</label>
          <Textarea value={internalNotes ?? order.internalNotes ?? ""} onChange={(e) => setInternalNotes(e.target.value)} />
        </div>
        <Button onClick={saveDetails} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </section>

      <section className="border border-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-3">Status History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-foreground/50">No changes recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="text-sm border-b border-border/50 pb-2 last:border-0">
                <span className="font-medium">{entry.field === "payment_status" ? "Payment status" : "Order status"}</span>: {entry.oldValue} →{" "}
                {entry.newValue}
                <span className="text-foreground/50"> by {entry.changedBy} on {new Date(entry.createdAt).toLocaleString()}</span>
                {entry.note && <div className="text-foreground/60 italic">{entry.note}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
