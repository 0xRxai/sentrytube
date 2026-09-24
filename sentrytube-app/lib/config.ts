import Constants from "expo-constants";

// Public config (safe for the client). Values come from app.json -> extra.
// NOTE: only the Supabase URL + publishable/anon key belong in the app.
// Secrets (Mux token, service role) stay on the backend.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
};

export const SUPABASE_URL = extra.supabaseUrl!;
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey!;
// Backend that holds server secrets (Mux upload creation, webhooks, etc.).
export const API_BASE_URL = extra.apiBaseUrl ?? "";
