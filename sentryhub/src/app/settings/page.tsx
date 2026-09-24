import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationSettings from "@/components/NotificationSettings";
import TagSubscriptions from "@/components/TagSubscriptions";
import PushToggle from "@/components/PushToggle";
import type { CategoryWithTags, NotificationPrefs } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: prefs }, { data: categories }, { data: subs }] = await Promise.all([
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("tag_categories").select("*, tags(*)").order("sort"),
    supabase.from("tag_subscriptions").select("tag_id").eq("user_id", user.id),
  ]);

  const defaults: NotificationPrefs = {
    user_id: user.id,
    notify_new_video: true,
    notify_comments: true,
    notify_likes: false,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Settings</h1>
        <p className="text-neutral-400">Control what you get notified about.</p>
      </div>

      <NotificationSettings prefs={(prefs as NotificationPrefs) ?? defaults} />

      <section>
        <h2 className="mb-1 text-lg font-semibold">Push notifications</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Get alerts on this device even when SentryHub isn&apos;t open. You&apos;ll receive
          pushes for the events enabled above.
        </p>
        <PushToggle />
      </section>

      <TagSubscriptions
        categories={(categories as CategoryWithTags[]) ?? []}
        subscribed={(subs ?? []).map((s) => s.tag_id)}
      />
    </div>
  );
}
