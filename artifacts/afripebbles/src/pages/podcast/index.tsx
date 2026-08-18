import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { useListPodcastEpisodes } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PlayCircle, Headphones, Clock, Calendar, Youtube, Mail } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { siteConfig, getConfiguredSocialLinks } from "@/content/site";
// @ts-ignore
import placeholderPodcast from "@assets/generated_images/placeholder_podcast.jpg";

export default function PodcastListing() {
  const { data: episodes, isLoading } = useListPodcastEpisodes();
  const socialLinks = getConfiguredSocialLinks();

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
        title={siteConfig.podcast.name}
        description={`${siteConfig.podcast.name} — AfriPebbles' podcast on faith, beauty, health, financial stability, and purpose.`}
        path="/podcast"
      />
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <Headphones size={28} />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-primary">
              {siteConfig.podcast.platform}
            </span>
            <h1 className="text-4xl md:text-6xl font-serif">{siteConfig.podcast.name}</h1>
            <p className="text-lg text-foreground/70 leading-relaxed">
              The Word of God and walking in His will — holistically, across faith, beauty, health,
              financial stability, and purpose — plus practical, day-in-the-life steps toward glowing up
              in each area.
            </p>
          </motion.div>
        </div>
      </div>

      {!isLoading && (!episodes || episodes.length === 0) && (
        <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-serif">The podcast hasn't launched yet</h2>
            <p className="text-foreground/70 leading-relaxed">
              {siteConfig.podcast.name} is on its way, publishing on {siteConfig.podcast.platform}. Here's what
              to expect once it's live:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-3 text-foreground/70">
              {siteConfig.podcast.topics.map((topic) => (
                <li key={topic} className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/community">
                <Button size="lg" className="rounded-full px-8 gap-2">
                  <Mail size={18} /> Get notified at launch
                </Button>
              </Link>
              {socialLinks.some((s) => s.label === "YouTube") && (
                <a href={socialLinks.find((s) => s.label === "YouTube")!.href} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="rounded-full px-8 gap-2">
                    <Youtube size={18} /> Follow on YouTube
                  </Button>
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 aspect-square bg-muted rounded-xl"></div>
                <div className="flex-1 space-y-4 py-4">
                  <div className="w-20 h-4 bg-muted rounded"></div>
                  <div className="w-3/4 h-8 bg-muted rounded"></div>
                  <div className="w-full h-16 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : episodes && episodes.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-12"
          >
            {episodes.map((episode) => (
              <motion.article
                key={episode.id}
                variants={fadeInUp}
                className="group flex flex-col md:flex-row gap-8 items-center bg-background rounded-2xl p-4 transition-all hover:bg-muted/20 border border-transparent hover:border-border"
              >
                <div className="w-full md:w-64 shrink-0">
                  <div className="aspect-square rounded-xl overflow-hidden relative shadow-sm">
                    <img
                      src={episode.coverImageUrl || placeholderPodcast}
                      alt={episode.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="text-white w-12 h-12" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider text-foreground/60">
                    <span className="text-primary bg-primary/10 px-2 py-1 rounded">Episode {episode.episodeNumber}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {format(new Date(episode.publishedAt), 'MMM d, yyyy')}</span>
                    {episode.durationSeconds && (
                      <span className="flex items-center gap-1"><Clock size={14}/> {Math.floor(episode.durationSeconds / 60)} min</span>
                    )}
                  </div>

                  <Link href={`/podcast/${episode.id}`}>
                    <h2 className="text-2xl md:text-3xl font-serif group-hover:text-primary transition-colors cursor-pointer">
                      {episode.title}
                    </h2>
                  </Link>

                  <p className="text-foreground/70 leading-relaxed line-clamp-3">
                    {episode.description}
                  </p>

                  <div className="pt-2">
                    <Link href={`/podcast/${episode.id}`} className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                      <PlayCircle size={18} /> Listen to episode
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-2xl font-serif mb-2">No episodes yet</h3>
            <p className="text-foreground/60">Check back soon for our first conversation.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
