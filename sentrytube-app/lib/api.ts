import { supabase } from "./supabase";
import { API_BASE_URL } from "./config";

/** Authenticated fetch to the Next.js API (Bearer). Core stays on Supabase for reads. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `API ${res.status}`);
  return json;
}
