import { LegalPage } from "@/components/LegalPage";
import { privacyPolicy } from "@/content/legal";

export default function PrivacyPolicyPage() {
  return <LegalPage content={privacyPolicy} path="/privacy" />;
}
