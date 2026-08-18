import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { useListUgcEntries } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Ugc() {
  const { data: entries, isLoading } = useListUgcEntries();

  return (
    <Layout>
      <Seo
        title="AfriPebbles UGC"
        description="Authentic user-generated content and brand collaboration work by AfriPebbles — portfolio and media kit."
        path="/ugc"
      />
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <Camera size={28} />
          </div>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-6">AfriPebbles <span className="italic text-primary">UGC</span></h1>
          <p className="text-foreground/80 leading-relaxed text-lg">
            Authentic, editorial user-generated content for brands seeking a warm, sophisticated voice with an engaged
            audience. Below is a selection of collaboration work — reach out to talk about your brand's next campaign.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-foreground/60 py-12 text-center border border-border rounded-2xl">
            Portfolio pieces are on their way — check back soon.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-background border border-border rounded-2xl overflow-hidden group"
              >
                <div className="aspect-[4/5] bg-muted overflow-hidden">
                  {entry.mediaType === "video" && entry.youtubeVideoId ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${entry.youtubeVideoId}`}
                      title={entry.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : entry.imageUrl ? (
                    <img
                      src={entry.imageUrl}
                      alt={entry.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                </div>
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-lg">{entry.title}</h3>
                    {entry.externalLink && (
                      <a href={entry.externalLink} target="_blank" rel="noopener noreferrer" aria-label={`View ${entry.title}`}>
                        <ExternalLink size={16} className="text-foreground/40 hover:text-primary" />
                      </a>
                    )}
                  </div>
                  {entry.brandName && <p className="text-xs uppercase tracking-wider text-foreground/50">{entry.brandName}</p>}
                  <p className="text-sm text-foreground/70 leading-relaxed">{entry.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-20 bg-muted/30 rounded-3xl p-10 md:p-14 text-center border border-border">
          <h2 className="text-2xl md:text-3xl font-serif mb-4">Interested in working together?</h2>
          <p className="text-foreground/70 max-w-xl mx-auto mb-8">
            Media kit available on request — reach out through the collaboration form and we'll follow up with rates and availability.
          </p>
          <Link href="/collaborate">
            <Button size="lg" className="rounded-full">
              Start a Collaboration
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
