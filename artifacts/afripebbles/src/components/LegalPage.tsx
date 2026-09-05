import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { siteConfig } from "@/content/site";
import type { LegalPageContent } from "@/content/legal";

export function LegalPage({ content, path }: { content: LegalPageContent; path: string }) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <Layout>
      <Seo title={content.title} description={content.intro} path={path} />
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif break-words">{content.title}</h1>
            <p className="text-foreground/70 leading-relaxed">{content.intro}</p>
          </div>

          <div className="flex items-start gap-3 bg-secondary/10 border border-secondary/30 rounded-xl p-4 text-sm text-foreground/70">
            <ShieldAlert size={18} className="shrink-0 mt-0.5 text-primary" />
            <p>{siteConfig.legalDraftNotice}</p>
          </div>

          <div className="space-y-10">
            {content.sections.map((section) => (
              <div key={section.heading} className="space-y-3">
                <h2 className="text-xl font-serif">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-foreground/70 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
