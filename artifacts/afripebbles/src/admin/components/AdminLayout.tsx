import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingBag,
  Star,
  Headphones,
  BookOpen,
  Home,
  Settings,
  Inbox,
  Mail,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "../context/AdminAuthContext";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: ShoppingBag, exact: false },
  { href: "/admin/recommendations", label: "Recommendations", icon: Star, exact: false },
  { href: "/admin/podcast", label: "Podcast", icon: Headphones, exact: false },
  { href: "/admin/articles", label: "Articles", icon: BookOpen, exact: false },
  { href: "/admin/homepage", label: "Homepage", icon: Home, exact: false },
  { href: "/admin/settings", label: "Site settings", icon: Settings, exact: false },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, exact: false },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, exact: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { adminEmail, signOut } = useAdminAuth();

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-64 shrink-0 border-r border-border bg-background flex flex-col">
        <div className="p-6 border-b border-border">
          <span className="font-serif text-xl">AfriPebbles</span>
          <p className="text-xs uppercase tracking-wider text-foreground/50 mt-1">Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? location === href : location === href || location.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <p className="px-3 text-xs text-foreground/50 truncate" title={adminEmail ?? undefined}>
            {adminEmail}
          </p>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => void signOut()}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
