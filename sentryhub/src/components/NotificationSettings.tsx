"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationPrefs } from "@/lib/types";

type Key = "notify_new_video" | "notify_comments" | "notify_likes";

const ROWS: { key: Key; label: string; help: string }[] = [
  {
    key: "notify_new_video",
    label: "New videos in tags I follow",
    help: "Get alerted when someone posts a video with a tag you subscribe to.",
  },
  {
    key: "notify_comments",
    label: "Comments on my videos",
    help: "Get alerted when someone comments on a video you uploaded.",
  },
  {
    key: "notify_likes",
    label: "Likes on my videos",
    help: "Get alerted when someone likes a video you uploaded.",
  },
];

export default function NotificationSettings({ prefs }: { prefs: NotificationPrefs }) {
  const supabase = createClient();
  const [state, setState] = useState(prefs);
  const [saved, setSaved] = useState(false);

  async function toggle(key: Key) {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    setSaved(false);
    // Upsert so the row exists even if the trigger default was skipped.
    await supabase.from("notification_prefs").upsert({
      user_id: state.user_id,
      notify_new_video: next.notify_new_video,
      notify_comments: next.notify_comments,
      notify_likes: next.notify_likes,
    });
    setSaved(true);
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Notification preferences</h2>
      <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-sm text-neutral-400">{row.help}</p>
            </div>
            <button
              role="switch"
              aria-checked={state[row.key]}
              onClick={() => toggle(row.key)}
              className={
                "relative h-6 w-11 shrink-0 rounded-full transition " +
                (state[row.key] ? "bg-brand" : "bg-neutral-700")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition " +
                  (state[row.key] ? "left-[22px]" : "left-0.5")
                }
              />
            </button>
          </div>
        ))}
      </div>
      {saved && <p className="mt-2 text-sm text-green-400">Saved.</p>}
    </section>
  );
}
