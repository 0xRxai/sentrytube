import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList from "@/components/NotificationList";
import type { AppNotification } from "@/lib/types";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select(
      "*, actor:profiles!notifications_actor_id_fkey(username, display_name), videos(id, title), tags(slug, label)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Notifications</h1>
      <NotificationList initial={(data as AppNotification[]) ?? []} />
    </div>
  );
}
