import { LegalPage } from "@/components/LegalPage";
import { digitalProductTerms } from "@/content/legal";

export default function DigitalProductTermsPage() {
  return <LegalPage content={digitalProductTerms} path="/digital-product-terms" />;
}
