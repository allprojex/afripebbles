import { useState, type ReactNode } from "react";
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
  ExternalLink,
  Menu,
  Camera,
  Quote,
  ClipboardList,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminAuth } from "../context/AdminAuthContext";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/orders", label: "Orders", icon: ClipboardList, exact: false },
  { href: "/products", label: "Products", icon: ShoppingBag, exact: false },
  { href: "/coupons", label: "Coupons", icon: Tag, exact: false },
  { href: "/recommendations", label: "Recommendations", icon: Star, exact: false },
  { href: "/podcast", label: "Podcast", icon: Headphones, exact: false },
  { href: "/articles", label: "Articles", icon: BookOpen, exact: false },
  { href: "/ugc", label: "UGC Portfolio", icon: Camera, exact: false },
  { href: "/testimonials", label: "Testimonials", icon: Quote, exact: false },
  { href: "/homepage", label: "Homepage", icon: Home, exact: false },
  { href: "/settings", label: "Site settings", icon: Settings, exact: false },
  { href: "/enquiries", label: "Enquiries", icon: Inbox, exact: false },
  { href: "/newsletter", label: "Newsletter", icon: Mail, exact: false },
];

/**
 * A plain anchor (not wouter's Link) to the relative path "/" — AdminApp's
 * router has base="/admin", so a wouter Link to "/" would resolve under that
 * base instead of leaving the admin subtree. A relative href always resolves
 * against the current origin, so this is correct in dev (Vite proxy) and
 * prod (Nginx) with no configured URL.
 */
function ViewWebsiteLink({ className }: { className?: string }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View website (opens in a new tab)"
      className={
        className ??
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      }
    >
      <ExternalLink size={16} />
      View Website
    </a>
  );
}

function NavList({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1" aria-label="Admin navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? location === href : location === href || location.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
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
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { adminEmail, signOut } = useAdminAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/20">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
        <span className="font-serif text-lg">AfriPebbles Admin</span>
        <div className="flex items-center gap-1">
          <ViewWebsiteLink className="p-2 text-primary" />
          <Button variant="ghost" size="icon" aria-label="Open admin navigation" onClick={() => setMobileNavOpen(true)}>
            <Menu size={20} />
          </Button>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 flex flex-col w-72">
          <SheetHeader className="p-6 border-b border-border text-left">
            <SheetTitle className="font-serif text-xl font-normal">AfriPebbles</SheetTitle>
            <p className="text-xs uppercase tracking-wider text-foreground/50">Admin</p>
          </SheetHeader>
          <NavList location={location} onNavigate={() => setMobileNavOpen(false)} />
          <div className="p-3 border-t border-border space-y-2">
            <ViewWebsiteLink />
            <p className="px-3 text-xs text-foreground/50 truncate" title={adminEmail ?? undefined}>
              {adminEmail}
            </p>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => void signOut()}>
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-background flex-col">
        <div className="p-6 border-b border-border">
          <span className="font-serif text-xl">AfriPebbles</span>
          <p className="text-xs uppercase tracking-wider text-foreground/50 mt-1">Admin</p>
        </div>
        <div className="px-3 pt-3">
          <ViewWebsiteLink />
        </div>
        <NavList location={location} />
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
