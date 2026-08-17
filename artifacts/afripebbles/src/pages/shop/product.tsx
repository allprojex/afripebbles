import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useParams, Link } from "wouter";
import { useGetProduct } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ProductDetailView } from "@/components/shop/ProductDetailView";

export default function ShopProduct() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: product, isLoading, error } = useGetProduct(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
            <div className="w-full md:w-1/2 aspect-[4/5] bg-muted animate-pulse rounded-2xl"></div>
            <div className="w-full md:w-1/2 space-y-6 pt-10">
              <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>
              <div className="w-3/4 h-12 bg-muted animate-pulse rounded"></div>
              <div className="w-1/4 h-8 bg-muted animate-pulse rounded"></div>
              <div className="space-y-3 pt-6">
                <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
                <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
                <div className="w-2/3 h-4 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="w-full h-14 bg-muted animate-pulse rounded-full mt-10"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <Seo title="Product Not Found" />
        <div className="container mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-serif mb-4">Product not found</h2>
          <Link href="/shop">
            <Button variant="outline">Back to Shop</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title={product.title}
        description={product.shortDescription ?? product.description.slice(0, 155)}
        path={`/shop/${product.id}`}
      />
      <ProductDetailView product={product} />
    </Layout>
  );
}
