import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const RANK: Record<Role, number> = { user: 1, moderator: 2, admin: 3 };

export type SessionInfo = {
  userId: string | null;
  username: string | null;
  role: Role;
};

// Single source of truth for "who is this and what can they do" in Server
// Components / route handlers. Mirrors the SQL role_rank/is_staff helpers.
export async function getSession(): Promise<SessionInfo> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, username: null, role: "user" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    username: profile?.username ?? null,
    role: (profile?.role as Role) ?? "user",
  };
}

export const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];
export const isStaff = (role: Role) => RANK[role] >= RANK.moderator;
export const isAdmin = (role: Role) => role === "admin";
