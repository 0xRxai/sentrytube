import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient as createCookieClient } from "./server";

/**
 * Route-handler client that supports BOTH:
 * - Cookie sessions (Next.js web app)
 * - Authorization: Bearer <access_token> (Expo iOS / Android / web)
 *
 * Keeps the existing cookie path intact; Bearer is an additive upgrade path
 * so the mobile app can call the same API without changing core auth tables.
 */
export function createClientFromRequest(request: Request): SupabaseClient {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return createJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }

  // Cookie session (browser Next.js). createCookieClient already wraps SSR cookies.
  return createCookieClient() as unknown as SupabaseClient;
}

/** Optional: build a cookie client that can also set cookies during auth flows. */
export function createMutableCookieClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* read-only context */
          }
        },
      },
    }
  );
}
