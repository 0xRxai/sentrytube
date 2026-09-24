"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryWithTags } from "@/lib/types";

// Lets the user follow/unfollow tags. Following a tag means they get a
// "new_video" notification whenever a video is published with that tag
// (provided their "new videos" preference is on).
export default function TagSubscriptions({
  categories,
  subscribed,
}: {
  categories: CategoryWithTags[];
  subscribed: string[];
}) {
  const supabase = createClient();
  const [set, setSet] = useState<Set<string>>(new Set(subscribed));

  async function toggle(tagId: string) {
    const following = set.has(tagId);
    const next = new Set(set);
    following ? next.delete(tagId) : next.add(tagId);
    setSet(next);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (following) {
      await supabase
        .from("tag_subscriptions")
        .delete()
        .eq("tag_id", tagId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("tag_subscriptions")
        .insert({ tag_id: tagId, user_id: user.id });
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Tags you follow</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Tap a tag to follow it. You&apos;ll be notified about new videos in the tags you
        follow.
      </p>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id}>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">
              {cat.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {cat.tags.map((t) => {
                const on = set.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={
                      "rounded-full border px-3 py-1 text-sm transition " +
                      (on
                        ? "border-brand bg-brand text-white"
                        : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                    }
                  >
                    {on ? "✓ " : ""}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
