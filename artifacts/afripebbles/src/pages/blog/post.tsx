import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useParams, Link } from "wouter";
import { useGetBlogPost } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "@/components/MarkdownContent";
// @ts-ignore
import placeholderBlog from "@assets/generated_images/placeholder_blog.jpg";

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug || "";
  const { data: post, isLoading, error } = useGetBlogPost(slug);
  const { toast } = useToast();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Article link copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-3xl">
          <div className="animate-pulse space-y-8">
            <div className="w-32 h-4 bg-muted rounded mx-auto mb-8"></div>
            <div className="w-3/4 h-12 bg-muted rounded mx-auto mb-6"></div>
            <div className="w-1/2 h-6 bg-muted rounded mx-auto mb-12"></div>
            <div className="w-full aspect-[16/9] bg-muted rounded-2xl mb-12"></div>
            <div className="space-y-4">
              <div className="w-full h-4 bg-muted rounded"></div>
              <div className="w-full h-4 bg-muted rounded"></div>
              <div className="w-5/6 h-4 bg-muted rounded"></div>
              <div className="w-full h-4 bg-muted rounded mt-8"></div>
              <div className="w-4/5 h-4 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <Seo title="Article Not Found" />
        <div className="container mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl font-serif mb-4">Article not found</h2>
          <Link href="/journal" className="text-primary hover:underline">
            Back to Journal
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo title={post.title} description={post.excerpt} path={`/journal/${post.slug}`} />
      <article className="pb-24">
        {/* Header */}
        <div className="container mx-auto px-4 pt-16 pb-12 max-w-4xl text-center">
          <Link href="/journal" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors mb-10">
            <ArrowLeft size={16} /> Back to Journal
          </Link>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-widest text-primary mb-6">
              <span>{post.category}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-8 break-words">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-center gap-6 text-sm text-foreground/60 font-medium flex-wrap">
              <span>By {post.authorDisplayName || "AfriPebbles"}</span>
              <span className="w-1 h-1 rounded-full bg-border"></span>
              <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(post.publishedAt), 'MMMM d, yyyy')}</span>
              <span className="w-1 h-1 rounded-full bg-border"></span>
              <span className="flex items-center gap-2"><Clock size={16} /> {post.readTimeMinutes} min read</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Image */}
        <div className="container mx-auto px-4 max-w-5xl mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden shadow-lg bg-muted"
          >
            <img 
              src={post.coverImageUrl || placeholderBlog} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="prose prose-stone prose-lg md:prose-xl max-w-none font-sans text-foreground/80"
          >
            <MarkdownContent content={post.content} />
          </motion.div>
          
          <Separator className="my-16" />
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap gap-2">
              {post.tags && post.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-muted/50 rounded-full text-sm text-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-serif italic text-foreground/60">Share this piece</span>
              <button onClick={handleShare} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground/60 hover:text-primary hover:border-primary transition-colors">
                <LinkIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </article>
      
      {/* Read Next Section placeholder (could use useListBlogPosts for related) */}
      <div className="bg-muted/20 py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-serif mb-8">Continue Reading</h2>
          <Link href="/journal">
            <button className="inline-flex items-center justify-center rounded-full bg-background border border-border px-8 py-3 text-sm font-medium hover:border-primary hover:text-primary transition-colors shadow-sm">
              View all articles
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
