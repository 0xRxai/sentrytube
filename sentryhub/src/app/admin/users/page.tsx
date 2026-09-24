import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, isAdmin } from "@/lib/auth";
import UserAdminTable from "@/components/UserAdminTable";
import type { FeatureFlag, Role } from "@/lib/types";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!isAdmin(session.role)) redirect("/admin");

  const supabase = createClient();
  const [{ data: users }, { data: flags }, { data: ents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("feature_flags").select("*").order("key"),
    supabase.from("user_entitlements").select("user_id, flag_key, enabled"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Users &amp; roles</h1>
      <p className="mb-6 text-neutral-400">
        Assign roles and override feature access per user.
      </p>
      <UserAdminTable
        currentUserId={session.userId!}
        users={
          (users as { id: string; username: string; display_name: string | null; role: Role; created_at: string }[]) ??
          []
        }
        flags={(flags as FeatureFlag[]) ?? []}
        entitlements={(ents as { user_id: string; flag_key: string; enabled: boolean }[]) ?? []}
      />
    </div>
  );
}
