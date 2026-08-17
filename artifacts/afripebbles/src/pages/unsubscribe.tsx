import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useUnsubscribeNewsletter } from "@workspace/api-client-react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Unsubscribe() {
  const token = new URLSearchParams(window.location.search).get("token");
  const mutation = useUnsubscribeNewsletter();
  const [state, setState] = useState<"pending" | "done" | "error">(token ? "pending" : "error");
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    mutation.mutate(
      { data: { token } },
      {
        onSuccess: () => setState("done"),
        onError: () => setState("error"),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Layout>
      <Seo title="Unsubscribe" path="/unsubscribe" index={false} />
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        {state === "pending" && <p className="text-foreground/60">Processing your request…</p>}
        {state === "done" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-2">You're unsubscribed</h1>
            <p className="text-foreground/60">You won't receive any more emails from AfriPebbles. You're always welcome back.</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
            <h1 className="text-2xl font-serif mb-2">This link isn't valid</h1>
            <p className="text-foreground/60">
              We couldn't find a matching subscription. If you're still receiving emails you'd like to stop, please{" "}
              <Link href="/contact" className="underline hover:text-primary">
                contact us
              </Link>
              .
            </p>
          </>
        )}
        <Link href="/" className="inline-block mt-8">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </Layout>
  );
}
