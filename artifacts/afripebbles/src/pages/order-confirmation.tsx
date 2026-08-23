import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { buildWhatsAppOrderLink, resolveCommerceWhatsappNumber } from "@/lib/whatsapp";
import { describeOrderItem } from "@/lib/orderItemDisplay";
import { useGetSiteSettings, type OrderWithItems } from "@workspace/api-client-react";

const ORDER_STORAGE_KEY = "afripebbles_last_order";

export default function OrderConfirmation() {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const { data: settings } = useGetSiteSettings();

  useEffect(() => {
    const raw = sessionStorage.getItem(ORDER_STORAGE_KEY);
    if (raw) {
      try {
        setOrder(JSON.parse(raw));
      } catch {
        setOrder(null);
      }
    }
  }, []);

  if (!order) {
    return (
      <Layout>
        <Seo title="Order Confirmation" index={false} />
        <div className="container mx-auto px-4 py-16 max-w-xl text-center">
          <p className="text-foreground/60 mb-6">We don't have a recent order to show here.</p>
          <Link href="/track-order">
            <Button variant="outline">Track an Order</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const whatsappNumber = resolveCommerceWhatsappNumber(settings);
  const whatsappLink = whatsappNumber ? buildWhatsAppOrderLink(order, whatsappNumber) : null;

  return (
    <Layout>
      <Seo title="Order Confirmation" index={false} />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <CheckCircle2 className="mx-auto text-primary mb-4" size={48} />
          <h1 className="text-3xl md:text-4xl font-serif mb-2">Order Recorded</h1>
          <p className="text-foreground/70">
            Your order has been recorded. Please send the prepared WhatsApp message to AfriPebbles to complete your order.
          </p>
        </div>

        <div className="border border-border rounded-2xl p-6 mb-6">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-foreground/60">Order Reference</span>
            <span className="font-mono font-medium">{order.orderReference}</span>
          </div>
          <div className="space-y-2 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-foreground/70">
                  {item.productName}
                  {describeOrderItem(item).length > 0 && ` (${describeOrderItem(item).join(", ")})`} × {item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal, order.currency)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatCurrency(order.grandTotal, order.currency)}</span>
          </div>
        </div>

        {whatsappLink ? (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="w-full rounded-full h-14 text-lg gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white">
              <MessageCircle size={20} /> Send Order to WhatsApp
            </Button>
          </a>
        ) : (
          <p className="text-sm text-center text-foreground/60 border border-dashed border-border rounded-xl p-4">
            WhatsApp confirmation isn't configured yet — please contact us with your order reference {order.orderReference} to complete payment.
          </p>
        )}

        <div className="mt-6 text-sm text-foreground/70 space-y-2 border-t border-border pt-6">
          {order.paymentMethod === "paypal" && settings?.paypalPaymentLink && (
            <p>
              Pay via PayPal:{" "}
              <a href={settings.paypalPaymentLink} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                {settings.paypalPaymentLink}
              </a>
            </p>
          )}
          {order.paymentMethod === "mobile_money" && settings?.mobileMoneyDetails && (
            <div>
              <p className="font-medium text-foreground">Mobile Money</p>
              <p>
                {settings.mobileMoneyDetails.provider} — {settings.mobileMoneyDetails.accountNumber} ({settings.mobileMoneyDetails.accountName})
              </p>
              <p>{settings.mobileMoneyDetails.instructions}</p>
            </div>
          )}
          {order.paymentMethod === "bank_transfer" && settings?.bankTransferDetails && (
            <div>
              <p className="font-medium text-foreground">Bank Transfer</p>
              <p>
                {settings.bankTransferDetails.bankName} — {settings.bankTransferDetails.accountName} — {settings.bankTransferDetails.accountNumber}
              </p>
              {settings.bankTransferDetails.ibanOrSwift && <p>IBAN/SWIFT: {settings.bankTransferDetails.ibanOrSwift}</p>}
              <p>{settings.bankTransferDetails.instructions}</p>
            </div>
          )}
          <p className="text-xs text-foreground/50">Use your order reference {order.orderReference} when paying, so we can match it to your order.</p>
        </div>

        <p className="text-xs text-center text-foreground/50 mt-8">
          Confirmation may take some time unless you send us the WhatsApp message above. You can always{" "}
          <Link href="/track-order" className="underline">
            track your order
          </Link>{" "}
          using your reference and email.
        </p>
      </div>
    </Layout>
  );
}
