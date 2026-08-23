import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Seo, organizationJsonLd } from "@/components/Seo";
import { Link } from "wouter";
import { useListProducts, ListProductsType } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AVAILABILITY_LABEL, handleImageError } from "@/lib/product";

export default function ShopListing() {
  const [filter, setFilter] = useState<"all" | ListProductsType>("all");
  
  const queryParams = filter === "all" ? {} : { type: filter };
  const { data: products, isLoading } = useListProducts(queryParams);

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <Layout>
      <Seo
        title="Shop"
        description="Digital planners, journals, and e-books, plus seasonal pre-order home decor from AfriPebbles."
        path="/shop"
        jsonLd={organizationJsonLd()}
      />
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <ShoppingBag size={28} />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif">The Shop</h1>
            <p className="text-lg text-foreground/70 leading-relaxed">
              Curated tools and beautiful objects designed to help you live a more intentional, grace-filled life.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center mb-12">
          <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-full">
              <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="digital" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Digital</TabsTrigger>
              <TabsTrigger value="physical" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Physical</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted rounded-xl mb-4"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-5 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer} 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={fadeInUp} className="group flex flex-col h-full">
                <Link href={`/shop/${product.id}`} className="block relative overflow-hidden rounded-xl bg-muted aspect-[4/5] mb-5 shadow-sm">
                  {product.availability !== 'available' && (
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded text-primary z-10 font-medium tracking-wide">
                      {AVAILABILITY_LABEL[product.availability]}
                    </div>
                  )}
                  {product.type === 'digital' && (
                    <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-[10px] uppercase tracking-wider px-2 py-1 rounded text-foreground/60 z-10 font-medium">
                      Digital
                    </div>
                  )}
                  {product.imageUrl && (
                    <img
                      src={product.thumbnailUrl ?? product.imageUrl}
                      alt={product.title}
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </Link>
                <div className="flex-1 flex flex-col">
                  <Link href={`/shop/${product.id}`}>
                    <h2 className="text-xl font-serif mb-2 group-hover:text-primary transition-colors">{product.title}</h2>
                  </Link>
                  <p className="text-foreground/60 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-medium text-lg">{product.currency} {product.price.toFixed(2)}</span>
                    <Link href={`/shop/${product.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-32 border border-dashed border-border rounded-2xl bg-muted/10">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-serif mb-2">No products found</h3>
            <p className="text-foreground/60">We couldn't find any items matching your criteria.</p>
            {filter !== "all" && (
              <Button variant="link" onClick={() => setFilter("all")} className="mt-4 text-primary">
                View all products
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
