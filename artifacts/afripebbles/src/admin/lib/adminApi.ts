import { supabase } from "./supabaseClient";

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Uploads go through a hand-written fetch call rather than the generated API
 * client — multipart/form-data doesn't fit the OpenAPI-driven JSON hooks used
 * everywhere else, and this endpoint is simple enough not to need codegen.
 */
export async function uploadImage(bucket: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: await authHeader(),
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Upload failed (${res.status})`);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
