import { createClient } from "@supabase/supabase-js";

// Service-role client for trusted server-only code (webhooks, dispatchers).
// Bypasses RLS — NEVER import this into a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
