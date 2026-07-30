import { LegalPage } from "@/components/LegalPage";
import { returnsPolicy } from "@/content/legal";

export default function ReturnsPage() {
  return <LegalPage content={returnsPolicy} path="/returns" />;
}
