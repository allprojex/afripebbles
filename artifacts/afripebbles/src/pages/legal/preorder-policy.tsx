import { LegalPage } from "@/components/LegalPage";
import { preorderPolicy } from "@/content/legal";

export default function PreorderPolicyPage() {
  return <LegalPage content={preorderPolicy} path="/preorder-policy" />;
}
