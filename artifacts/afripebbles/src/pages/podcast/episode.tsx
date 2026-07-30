import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useParams, Link } from "wouter";
import { useGetPodcastEpisode } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Clock, Calendar, ArrowLeft, Heart, User, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toYoutubeEmbedUrl } from "@/lib/youtube";
// @ts-ignore
import placeholderPodcast from "@assets/generated_images/placeholder_podcast.jpg";

export default function PodcastEpisode() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: episode, isLoading, error } = useGetPodcastEpisode(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-4xl">
          <div className="animate-pulse space-y-8">
            <div className="w-32 h-6 bg-muted rounded"></div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 aspect-square bg-muted rounded-xl"></div>
              <div className="flex-1 space-y-4">
                <div className="w-3/4 h-10 bg-muted rounded"></div>
                <div className="w-1/2 h-6 bg-muted rounded"></div>
                <div className="w-full h-24 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !episode) {
    return (
      <Layout>
        <Seo title="Episode Not Found" />
        <div className="container mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-serif mb-4">Episode not found</h2>
          <Link href="/podcast">
            <Button variant="outline">Back to Podcast</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const embedUrl = toYoutubeEmbedUrl(episode.externalUrl);

  return (
    <Layout>
      <Seo title={episode.title} description={episode.description.slice(0, 155)} path={`/podcast/${episode.id}`} />
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/podcast" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors mb-10">
          <ArrowLeft size={16} /> Back to all episodes
        </Link>

        <div className="bg-background rounded-3xl border border-border overflow-hidden shadow-sm">
          {embedUrl ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title={episode.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-muted flex items-center justify-center relative">
              <img
                src={episode.coverImageUrl || placeholderPodcast}
                alt={episode.title}
                className="w-full h-full object-cover absolute inset-0 opacity-50"
              />
              <p className="relative text-sm font-medium text-foreground/70 bg-background/90 px-4 py-2 rounded-full">
                Video for this episode isn't available yet
              </p>
            </div>
          )}

          <div className="p-6 md:p-10 space-y-6">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider text-foreground/60">
              <span className="text-primary bg-primary/10 px-2 py-1 rounded">Episode {episode.episodeNumber}</span>
              {episode.season && <span>Season {episode.season}</span>}
            </div>

            <h1 className="text-3xl md:text-5xl font-serif leading-tight">{episode.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60">
              <span className="flex items-center gap-1.5"><Calendar size={16}/> {format(new Date(episode.publishedAt), 'MMMM d, yyyy')}</span>
              {episode.durationSeconds && (
                <span className="flex items-center gap-1.5"><Clock size={16}/> {Math.floor(episode.durationSeconds / 60)} min listen</span>
              )}
              {episode.guestName && (
                <span className="flex items-center gap-1.5"><User size={16}/> with {episode.guestName}</span>
              )}
            </div>

            {(episode.showNotesUrl || episode.transcriptUrl || episode.externalUrl) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {episode.externalUrl && (
                  <a href={episode.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    Watch on YouTube <ExternalLink size={14} />
                  </a>
                )}
                {episode.showNotesUrl && (
                  <a href={episode.showNotesUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    Show notes <ExternalLink size={14} />
                  </a>
                )}
                {episode.transcriptUrl && (
                  <a href={episode.transcriptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <FileText size={14} /> Transcript
                  </a>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="p-6 md:p-10 bg-muted/10">
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
              <Heart size={20} className="text-primary" /> Episode Notes
            </h3>
            <div className="prose prose-stone max-w-none text-foreground/80 leading-relaxed font-sans">
              <p className="whitespace-pre-wrap">{episode.description}</p>
            </div>

            {episode.tags && episode.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {episode.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-background border border-border rounded-full text-xs text-foreground/60">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 text-center bg-secondary/20 rounded-3xl p-10 border border-secondary/30">
          <h3 className="text-2xl font-serif mb-3">Loved this conversation?</h3>
          <p className="text-foreground/70 mb-6 max-w-md mx-auto">
            Subscribe to our newsletter to receive notes on intentional living and updates on new episodes.
          </p>
          <Link href="/community">
            <Button className="rounded-full px-8">Join the Newsletter</Button>
          </Link>
        </div>
      </article>
    </Layout>
  );
}
