import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAdminAuth } from "../context/AdminAuthContext";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isConfigured, isLoading, isAdmin } = useAdminAuth();

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <p className="text-foreground/70 max-w-md">
          Admin sign-in isn&apos;t configured yet. Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>, then reload.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-foreground/50 text-sm">Checking your session…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  return <>{children}</>;
}
