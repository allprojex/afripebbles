import { useParams, Link } from "wouter";
import { useAdminGetProduct } from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { ProductDetailView } from "@/components/shop/ProductDetailView";

/**
 * Admin-only draft preview. Reads via the already-gated /admin/products/:id
 * endpoint (requireAdmin verifies the Supabase session server-side — this
 * page is never a new public surface), renders the same presentational
 * component the live shop page uses, and is deliberately outside AdminLayout
 * so it looks like the real site rather than the CMS.
 */
export default function AdminProductPreview() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: product, isLoading, error } = useAdminGetProduct(id);

  if (isLoading) {
    return <p className="p-12 text-center text-foreground/50 text-sm">Loading preview…</p>;
  }

  if (error || !product) {
    return (
      <div className="p-12 text-center">
        <p className="text-foreground/60 mb-4">Couldn't load this product.</p>
        <Link href="/admin/products">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <Layout>
      <Seo title={`Preview: ${product.title}`} index={false} />
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold uppercase tracking-wider">DRAFT PREVIEW — not visible publicly</span>
          <Link href={`/admin/products/${product.id}`}>
            <Button size="sm" variant="secondary" className="gap-2">
              <ArrowLeft size={14} /> Back to Edit Product
            </Button>
          </Link>
        </div>
      </div>
      <ProductDetailView product={product} />
    </Layout>
  );
}
