import { LegalPage } from "@/components/LegalPage";
import { cookiePolicy } from "@/content/legal";

export default function CookiePolicyPage() {
  return <LegalPage content={cookiePolicy} path="/cookies" />;
}
