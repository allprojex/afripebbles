import Layout from "@/components/layout/Layout";
import { Seo, organizationJsonLd } from "@/components/Seo";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useGetHomepageSummary } from "@workspace/api-client-react";
import { ArrowRight, PlayCircle, ShoppingBag, Heart, Headphones, Star, Camera, Mail } from "lucide-react";
import { siteConfig } from "@/content/site";
import { AVAILABILITY_LABEL } from "@/lib/product";
// @ts-ignore
import heroImage from "@assets/generated_images/hero.jpg";
// @ts-ignore
import placeholderPodcast from "@assets/generated_images/placeholder_podcast.jpg";

export default function Home() {
  const { data: summary, isLoading } = useGetHomepageSummary();

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <Layout>
      <Seo title="Home" path="/" jsonLd={organizationJsonLd()} />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="AfriPebbles Lifestyle"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
            <motion.span variants={fadeInUp} className="text-sm font-semibold tracking-widest uppercase text-primary">
              Welcome to {siteConfig.brand.name}
            </motion.span>
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-serif text-foreground leading-tight">
              No Dream Is Too Small <br/><span className="italic text-primary">In God's Hands</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              {siteConfig.brand.oneLineDescription}
            </motion.p>
            <motion.div variants={fadeInUp} className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/shop">
                <Button size="lg" className="rounded-full px-8 text-base">Explore the Shop</Button>
              </Link>
              <Link href="/podcast">
                <Button size="lg" variant="outline" className="rounded-full px-8 text-base bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background">
                  Discover {siteConfig.podcast.name}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pebble & Ripple Meaning */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="space-y-6">
            <Heart className="w-8 h-8 text-secondary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif">Every small faithful step creates lasting transformation.</h2>
            <p className="text-foreground/70 leading-relaxed text-lg">
              {siteConfig.brand.story[1]}
            </p>
            <div className="pt-6">
              <Link href="/about" className="inline-flex items-center gap-2 text-primary font-medium hover:text-foreground transition-colors">
                Read our story <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Growth Areas */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif mb-3">Growing in every area that matters</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">The six areas AfriPebbles walks alongside women in, every day.</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 gap-6"
          >
            {siteConfig.growthAreas.map((area) => (
              <motion.div key={area.title} variants={fadeInUp} className="bg-background p-6 rounded-2xl border border-border text-center">
                <h3 className="font-serif text-lg mb-2">{area.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{area.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Podcast */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="order-2 md:order-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase">
                <Headphones size={14} /> {siteConfig.podcast.platform}
              </div>
              <h2 className="text-3xl md:text-5xl font-serif leading-tight">{siteConfig.podcast.name}</h2>
              <p className="text-foreground/70 text-lg leading-relaxed">
                {summary?.latestEpisode
                  ? summary.latestEpisode.description
                  : "Conversations on faith, beauty, health, financial stability, and purpose — coming soon."}
              </p>
              <div className="pt-4 flex items-center gap-4">
                {summary?.latestEpisode ? (
                  <Link href={`/podcast/${summary.latestEpisode.id}`}>
                    <Button className="rounded-full gap-2 px-6">
                      <PlayCircle size={18} /> Listen Now
                    </Button>
                  </Link>
                ) : (
                  <Link href="/podcast">
                    <Button className="rounded-full gap-2 px-6">
                      <PlayCircle size={18} /> Learn More
                    </Button>
                  </Link>
                )}
                <Link href="/podcast" className="text-sm font-medium hover:text-primary transition-colors">
                  View all episodes
                </Link>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } } }} className="order-1 md:order-2 relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-xl relative group">
                <img
                  src={summary?.latestEpisode?.coverImageUrl || placeholderPodcast}
                  alt={siteConfig.podcast.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-secondary/50 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Shop / Digital Products / Pre-order intro */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-3">Tools for intentional growth</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">
              Digital planners, journals, and e-books available now, plus a seasonal pre-order collection of home decor.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-background p-8 rounded-2xl border border-border">
              <ShoppingBag className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-serif text-xl mb-2">Digital Products</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                {siteConfig.shop.digitalCategories.join(", ")} — available immediately, delivered by download.
              </p>
            </div>
            <div className="bg-background p-8 rounded-2xl border border-border">
              <ShoppingBag className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-serif text-xl mb-2">{siteConfig.shop.preorderCollectionName}</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                {siteConfig.shop.preorderDescription} Fulfilment takes {siteConfig.shop.preorderFulfilmentWindow}.
              </p>
            </div>
          </div>

          {!isLoading && summary?.featuredProducts && summary.featuredProducts.length > 0 && (
            <>
              <div className="flex justify-between items-end mb-8">
                <h3 className="text-xl font-serif">Featured right now</h3>
                <Link href="/shop" className="hidden sm:inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  Shop all <ArrowRight size={16} />
                </Link>
              </div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              >
                {summary.featuredProducts.map((product) => (
                  <motion.div key={product.id} variants={fadeInUp} className="group cursor-pointer">
                    <Link href={`/shop/${product.id}`}>
                      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted mb-4 relative">
                        {product.availability !== 'available' && (
                          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded text-primary z-10 font-medium">
                            {AVAILABILITY_LABEL[product.availability]}
                          </div>
                        )}
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <h3 className="font-serif text-lg mb-1 group-hover:text-primary transition-colors">{product.title}</h3>
                      <p className="text-foreground/60 text-sm mb-2 line-clamp-1">{product.description}</p>
                      <div className="font-medium">{product.currency} {product.price.toFixed(2)}</div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}

          <div className="mt-8 text-center">
            <Link href="/shop">
              <Button variant="outline" className="rounded-full">Visit the Shop</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial */}
      {!isLoading && summary?.featuredBlogPosts && summary.featuredBlogPosts.length > 0 && (
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex justify-between items-end mb-12">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                <h2 className="text-3xl font-serif mb-2">The Journal</h2>
                <p className="text-foreground/60">Thoughts on faith, wellness, and living well.</p>
              </motion.div>
              <Link href="/journal" className="hidden sm:inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                Read more <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {summary.featuredBlogPosts.slice(0, 2).map((post, i) => (
                <motion.div
                  key={post.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.2 } } }}
                  className="group"
                >
                  <Link href={`/journal/${post.slug}`} className="block">
                    <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted mb-6">
                      {post.coverImageUrl && (
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      <span>{post.category}</span>
                      <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                      <span>{post.readTimeMinutes} min read</span>
                    </div>
                    <h3 className="font-serif text-2xl mb-3 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-foreground/70 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Curated Recommendations */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-6">
            <Star className="w-8 h-8 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-serif">Recommendations we trust</h2>
            <p className="text-foreground/70 leading-relaxed text-lg">
              A curated collection across beauty, wellness, faith, books, and home — thoughtfully chosen to
              support intentional living.
            </p>
            <Link href="/recommendations">
              <Button variant="outline" className="rounded-full px-8">Browse Recommendations</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Collaboration Invite */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-6">
            <Camera className="w-8 h-8 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-serif">Partner with AfriPebbles</h2>
            <p className="text-foreground/70 leading-relaxed text-lg">
              AfriPebbles works with brands on UGC content, sponsored posts, and creative partnerships across
              faith, wellness, beauty, and lifestyle.
            </p>
            <Link href="/collaborate">
              <Button className="rounded-full px-8">Start a Collaboration</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Newsletter / Community */}
      <section className="py-24 bg-secondary/10 border-t border-border">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-6">
            <Mail className="w-8 h-8 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-serif">Join the community</h2>
            <p className="text-foreground/70 leading-relaxed text-lg">
              A quiet space in your inbox — gentle encouragement, curated resources, and an invitation to live
              on purpose.
            </p>
            <Link href="/community">
              <Button size="lg" className="rounded-full px-8">
                Join the Community
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
