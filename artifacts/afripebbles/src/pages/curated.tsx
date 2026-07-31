import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useListCuratedPicks, useGetSiteSettings } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Star, ArrowUpRight, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteConfig } from "@/content/site";
import { resolveSiteSettings } from "@/lib/settings";

export default function CuratedPicks() {
  const [filter, setFilter] = useState<string>("All");

  const queryParams = filter === "All" ? {} : { category: filter };
  const { data: picks, isLoading } = useListCuratedPicks(queryParams);
  const { data: siteSettings } = useGetSiteSettings();
  const resolved = resolveSiteSettings(siteSettings);

  const categories = ["All", ...siteConfig.recommendationCategories];

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
        title="Recommendations"
        description="Curated favorites across beauty, wellness, faith, books, and home — thoughtfully chosen by AfriPebbles."
        path="/recommendations"
      />
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Star size={28} />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif">Recommendations</h1>
            <p className="text-lg text-foreground/70 leading-relaxed">
              A thoughtful collection of things we trust — across beauty, wellness, faith, books, and home —
              chosen to support a more intentional life.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-3xl mx-auto flex items-start gap-3 bg-muted/40 border border-border rounded-xl p-4 text-sm text-foreground/70">
          <Info size={18} className="shrink-0 mt-0.5 text-primary" />
          <p>{resolved.affiliateDisclosure}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex justify-center mb-12 overflow-x-auto no-scrollbar pb-2">
          <Tabs defaultValue="All" onValueChange={setFilter} className="w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-full flex h-auto flex-wrap justify-center">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm text-sm"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-background border border-border rounded-2xl p-6">
                <div className="w-full aspect-square bg-muted rounded-xl mb-6"></div>
                <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : picks && picks.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {picks.map((pick) => (
              <motion.div
                key={pick.id}
                variants={fadeInUp}
                className="group flex flex-col bg-background border border-border hover:border-primary/30 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all h-full"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-6">
                  {pick.imageUrl && (
                  <img
                    src={pick.imageUrl}
                    alt={pick.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">{pick.brand}</span>
                    {pick.isPersonallyTested && (
                      <span className="text-[10px] uppercase tracking-wide bg-secondary/30 text-foreground/70 px-2 py-0.5 rounded-full">
                        Personally tested
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-serif mb-3 leading-snug">{pick.title}</h2>
                  <p className="text-foreground/70 text-sm mb-4 flex-1">{pick.description}</p>
                  {pick.isAffiliate && (
                    <p className="text-[11px] text-foreground/40 mb-3">{pick.affiliateDisclosureText || resolved.affiliateDisclosure}</p>
                  )}

                  <a
                    href={pick.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors font-medium text-sm mt-auto"
                  >
                    Shop Now <ArrowUpRight size={16} />
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-32 border border-dashed border-border rounded-2xl bg-muted/10">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-serif mb-2">No picks found</h3>
            <p className="text-foreground/60">Check back soon for new recommendations in this category.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
