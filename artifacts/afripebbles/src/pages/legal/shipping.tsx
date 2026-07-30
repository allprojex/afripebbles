import { LegalPage } from "@/components/LegalPage";
import { shippingPolicy } from "@/content/legal";

export default function ShippingPage() {
  return <LegalPage content={shippingPolicy} path="/shipping" />;
}
