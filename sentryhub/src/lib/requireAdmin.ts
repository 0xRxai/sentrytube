import { createClient } from "@/lib/supabase/server";

// Helper for admin-only route handlers. Returns the supabase client + user id
// if the caller is an admin, otherwise an error code to return.
export async function requireRole(min: "moderator" | "admin") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 401 as const, supabase: null, userId: null };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const rank = me?.role === "admin" ? 3 : me?.role === "moderator" ? 2 : 1;
  const need = min === "admin" ? 3 : 2;
  if (rank < need) return { error: 403 as const, supabase: null, userId: null };

  return { error: null, supabase, userId: user.id };
}
