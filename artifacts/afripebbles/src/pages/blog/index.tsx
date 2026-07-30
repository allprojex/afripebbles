import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
// @ts-ignore
import placeholderBlog from "@assets/generated_images/placeholder_blog.jpg";

const CATEGORIES = ["All", "Faith", "Beauty", "Wellness", "Purpose", "Finance", "Lifestyle"];

export default function BlogListing() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const queryParams = activeCategory === "All" ? {} : { category: activeCategory };
  const { data: posts, isLoading } = useListBlogPosts(queryParams);

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <Layout>
      <Seo
        title="Journal"
        description="Long-form thoughts on faith, wellness, and living intentionally, from AfriPebbles."
        path="/journal"
      />
      <div className="bg-background pt-20 pb-12">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-serif">The Journal</h1>
            <p className="text-lg text-foreground/70 leading-relaxed font-sans max-w-2xl mx-auto">
              Long-form thoughts on navigating life with grace. A quiet corner of the internet to read, reflect, and grow.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="sticky top-20 z-40 bg-background/90 backdrop-blur-md border-y border-border py-4 mb-12">
        <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex justify-start md:justify-center gap-2 md:gap-8 w-max md:w-auto mx-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-sm font-medium tracking-wide whitespace-nowrap transition-colors px-3 py-1.5 rounded-full ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground/60 hover:text-primary hover:bg-primary/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-24 max-w-6xl">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-muted rounded-xl mb-6"></div>
                <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-muted rounded w-full mb-3"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer} 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16"
          >
            {/* Featured Post takes up 2 cols on tablet/desktop if it's the first one */}
            {posts.map((post, i) => {
              const isFeatured = i === 0 && activeCategory === "All";
              
              return (
                <motion.article 
                  key={post.id} 
                  variants={fadeInUp} 
                  className={`group flex flex-col ${isFeatured ? 'md:col-span-2 lg:col-span-2 md:flex-row gap-8 items-center border-b border-border pb-16 mb-4' : ''}`}
                >
                  <Link href={`/journal/${post.slug}`} className={`block overflow-hidden rounded-xl bg-muted ${isFeatured ? 'w-full md:w-1/2 aspect-[4/3] md:aspect-[16/10]' : 'w-full aspect-[4/3] mb-6'} shadow-sm`}>
                    <img 
                      src={post.coverImageUrl || placeholderBlog} 
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  </Link>
                  <div className={`flex-1 flex flex-col ${isFeatured ? 'md:py-8' : ''}`}>
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      <span>{post.category}</span>
                      <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                      <span>{post.readTimeMinutes} min read</span>
                    </div>
                    <Link href={`/journal/${post.slug}`}>
                      <h2 className={`${isFeatured ? 'text-3xl md:text-5xl' : 'text-2xl'} font-serif mb-4 group-hover:text-primary transition-colors leading-tight`}>
                        {post.title}
                      </h2>
                    </Link>
                    <p className={`text-foreground/70 ${isFeatured ? 'text-lg line-clamp-3' : 'line-clamp-2'} mb-6 leading-relaxed`}>
                      {post.excerpt}
                    </p>
                    <div className="mt-auto">
                      <Link href={`/journal/${post.slug}`} className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5">
                        Read full article <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-32 border border-dashed border-border rounded-2xl bg-muted/10">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-serif mb-2">No articles found</h3>
            <p className="text-foreground/60">We haven't published anything in this category yet.</p>
            {activeCategory !== "All" && (
              <button onClick={() => setActiveCategory("All")} className="mt-4 text-primary font-medium hover:underline">
                View all articles
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
