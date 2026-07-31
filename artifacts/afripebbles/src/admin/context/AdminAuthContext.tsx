import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useGetAdminMe } from "@workspace/api-client-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

interface AdminAuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  isAdmin: boolean;
  adminEmail: string | null;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoaded(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // The session alone is never trusted as proof of admin access — this call
  // hits requireAdmin on the server, which is the actual authority.
  // Orval's generated query-options type technically requires `queryKey`,
  // which the hook itself supplies internally — this cast is the one place
  // that gap is bridged instead of scattering `as any` across call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meQuery = useGetAdminMe({
    query: { enabled: Boolean(session), retry: false } as any,
  });

  const isLoading = !sessionLoaded || (Boolean(session) && meQuery.isLoading);
  const isAdmin = Boolean(session) && meQuery.isSuccess && Boolean(meQuery.data);

  const value: AdminAuthContextValue = {
    isConfigured: isSupabaseConfigured,
    isLoading,
    session,
    isAdmin,
    adminEmail: meQuery.data?.email ?? null,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
