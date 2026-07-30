import { LegalPage } from "@/components/LegalPage";
import { termsAndConditions } from "@/content/legal";

export default function TermsPage() {
  return <LegalPage content={termsAndConditions} path="/terms" />;
}
