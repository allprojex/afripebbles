import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * False until VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set. The public
 * site must keep working with these unset — only /admin pages need to check
 * this and show a clear "not configured" state instead of a broken form.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
