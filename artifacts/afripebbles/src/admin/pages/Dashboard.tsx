import { Link } from "wouter";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { ShoppingBag, Headphones, Star, BookOpen, Mail, Inbox } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";

const CONTENT_LABEL: Record<string, string> = {
  product: "Product",
  podcast_episode: "Podcast episode",
  blog_post: "Article",
  curated_pick: "Recommendation",
};

const CONTENT_HREF: Record<string, string> = {
  product: "/products",
  podcast_episode: "/podcast",
  blog_post: "/articles",
  curated_pick: "/recommendations",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
  sub?: string;
  href: string;
}) {
  return (
    <Link href={href} className="block bg-background border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Icon className="text-primary" size={20} />
        <span className="text-2xl font-serif">{value}</span>
      </div>
      <p className="text-sm font-medium">{label}</p>
      {sub && <p className="text-xs text-foreground/50 mt-0.5">{sub}</p>}
    </Link>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();

  if (isLoading || !data) {
    return <div className="animate-pulse text-foreground/50 text-sm">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-serif mb-2">Dashboard</h1>
        <p className="text-foreground/60">A live snapshot of AfriPebbles content and enquiries.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ShoppingBag} label="Published" value={data.products.published} href="/products?status=published" />
          <StatCard icon={ShoppingBag} label="Draft" value={data.products.draft} href="/products?status=draft" />
          <StatCard icon={ShoppingBag} label="Pre-order" value={data.preorderProducts} href="/products?availability=preorder" />
          <StatCard icon={ShoppingBag} label="Total" value={data.products.total} href="/products" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">Content</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Headphones}
            label="Podcast episodes"
            value={data.podcastEpisodes.total}
            sub={`${data.podcastEpisodes.published} published`}
            href="/podcast"
          />
          <StatCard
            icon={BookOpen}
            label="Articles"
            value={data.articles.total}
            sub={`${data.articles.published} published`}
            href="/articles"
          />
          <StatCard
            icon={Star}
            label="Recommendations"
            value={data.recommendations.total}
            sub={`${data.recommendations.published} published`}
            href="/recommendations"
          />
          <StatCard icon={Mail} label="Newsletter subscribers" value={data.newsletterSubscribers} href="/newsletter" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">Enquiries</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Inbox} label="Contact" value={data.contactEnquiries} href="/enquiries?tab=contact" />
          <StatCard icon={Inbox} label="Collaboration" value={data.collaborationEnquiries} href="/enquiries?tab=collaboration" />
          <StatCard icon={Inbox} label="Product enquiries" value={data.productEnquiries} href="/enquiries?tab=product" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50 mb-4">Recently updated</h2>
        {data.recentlyUpdated.length === 0 ? (
          <p className="text-sm text-foreground/60 border border-dashed border-border rounded-xl p-6 text-center">
            Nothing has been created or edited yet.
          </p>
        ) : (
          <div className="bg-background border border-border rounded-2xl divide-y divide-border">
            {data.recentlyUpdated.map((item) => (
              <Link
                key={`${item.contentType}-${item.id}`}
                href={`${CONTENT_HREF[item.contentType]}/${item.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-foreground/50 mr-2">{CONTENT_LABEL[item.contentType]}</span>
                  <span className="font-medium truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-foreground/40">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
