import type { ReactNode } from "react";
import Layout from "@/components/layout/Layout";
import { Seo, organizationJsonLd } from "@/components/Seo";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Leaf, Sun, MapPin, Feather, Star } from "lucide-react";
import { siteConfig } from "@/content/site";
// @ts-ignore
import portraitImage from "@assets/generated_images/about_portrait.jpg";

const GROWTH_AREA_ICONS: Record<string, ReactNode> = {
  Faith: <Heart className="w-6 h-6 text-primary" />,
  Beauty: <Feather className="w-6 h-6 text-primary" />,
  Health: <Leaf className="w-6 h-6 text-primary" />,
  "Financial stability": <Sun className="w-6 h-6 text-primary" />,
  Purpose: <MapPin className="w-6 h-6 text-primary" />,
  "Intentional living": <Star className="w-6 h-6 text-primary" />,
};

export default function About() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <Layout>
      <Seo
        title="About"
        description="The story, vision, and mission behind AfriPebbles — a faith-rooted lifestyle brand for women."
        path="/about"
        jsonLd={organizationJsonLd()}
      />
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="space-y-8"
            >
              <h1 className="text-4xl md:text-6xl font-serif leading-tight">
                Our Story & <br/><span className="italic text-primary">Mission</span>
              </h1>
              <div className="space-y-6 text-lg text-foreground/80 leading-relaxed font-sans">
                {siteConfig.brand.story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="aspect-[3/4] md:aspect-[4/5] rounded-t-full rounded-b-xl overflow-hidden shadow-2xl relative p-2 bg-white">
                <img
                  src={portraitImage}
                  alt="AfriPebbles brand imagery"
                  className="w-full h-full object-cover rounded-t-[calc(50%-8px)] rounded-b-lg"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/40 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-2xl font-serif mb-3">Vision</h2>
              <p className="text-foreground/70 leading-relaxed">{siteConfig.brand.vision}</p>
            </div>
            <div>
              <h2 className="text-2xl font-serif mb-3">Mission</h2>
              <p className="text-foreground/70 leading-relaxed">{siteConfig.brand.mission}</p>
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-2xl font-serif mb-4">Our Values</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {siteConfig.brand.values.map((value) => (
                <span key={value} className="px-4 py-2 rounded-full bg-background border border-border text-sm text-foreground/80">
                  {value}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-serif mb-4">The Pillars</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-lg">The foundational areas where we seek to grow intentionally, every single day.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-8"
          >
            {siteConfig.growthAreas.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={fadeInUp}
                className="bg-muted/20 p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {GROWTH_AREA_ICONS[pillar.title]}
                </div>
                <h3 className="text-xl font-serif mb-3">{pillar.title}</h3>
                <p className="text-foreground/70 leading-relaxed">{pillar.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-muted/30 border-y border-border text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-serif">Ready to start the journey?</h2>
            <p className="text-lg text-foreground/70">
              Join our community to receive weekly encouragement, early access to shop updates, and podcast news.
            </p>
            <div className="flex justify-center pt-4">
              <Link href="/community">
                <Button size="lg" className="rounded-full px-8 text-base">
                  Join the Community
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
