import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { useTrackOrder, useGetOrderItemDownloadUrl, ApiError } from "@workspace/api-client-react";
import { describeOrderItem } from "@/lib/orderItemDisplay";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

function DownloadButton({ orderReference, email, productId }: { orderReference: string; email: string; productId: number }) {
  const [requested, setRequested] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isFetching, error } = useGetOrderItemDownloadUrl({ orderReference, email, productId }, { query: { enabled: requested } as any });

  useEffect(() => {
    if (data?.downloadUrl) {
      window.location.href = data.downloadUrl;
    }
  }, [data?.downloadUrl]);

  return (
    <div className="flex flex-col items-end">
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={isFetching} onClick={() => setRequested(true)}>
        <Download size={14} /> {isFetching ? "Preparing…" : "Download"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">Couldn't get the download link.</p>}
    </div>
  );
}

export default function TrackOrder() {
  const [orderReference, setOrderReference] = useState("");
  const [email, setEmail] = useState("");
  const trackMutation = useTrackOrder();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackMutation.mutate({ data: { orderReference: orderReference.trim(), email: email.trim() } });
  };

  const order = trackMutation.data;

  return (
    <Layout>
      <Seo title="Track Your Order" index={false} />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-serif mb-2">Track Your Order</h1>
        <p className="text-foreground/60 mb-8">Enter your order reference and the email you used at checkout.</p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
          <Input placeholder="Order reference (e.g. AP-20260101-XXXXXX)" value={orderReference} onChange={(e) => setOrderReference(e.target.value)} required />
          <Input type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" disabled={trackMutation.isPending}>
            {trackMutation.isPending ? "Searching…" : "Track"}
          </Button>
        </form>

        {trackMutation.isError && (
          <p className="text-sm text-destructive mb-6">
            {trackMutation.error instanceof ApiError && trackMutation.error.status === 404
              ? "No order found for that reference and email."
              : "Something went wrong. Please try again."}
          </p>
        )}

        {order && (
          <div className="border border-border rounded-2xl p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Order Reference</span>
              <span className="font-mono font-medium">{order.orderReference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Date</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Payment Status</span>
              <span>{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Order Status</span>
              <span>{ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}</span>
            </div>
            {order.trackingNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Tracking Number</span>
                <span className="font-mono">{order.trackingNumber}</span>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    <div>
                      {item.productName}
                      {describeOrderItem(item).length > 0 && ` (${describeOrderItem(item).join(", ")})`} × {item.quantity}
                    </div>
                    <div className="text-foreground/60">{formatCurrency(item.lineTotal, order.currency)}</div>
                  </div>
                  {item.isDigital && order.paymentStatus === "paid" && item.productId != null && (
                    <DownloadButton orderReference={order.orderReference} email={email.trim()} productId={item.productId} />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-between text-lg font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.grandTotal, order.currency)}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
