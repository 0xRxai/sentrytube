"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

function describe(n: AppNotification): string {
  const who = n.actor?.display_name ?? n.actor?.username ?? "Someone";
  switch (n.type) {
    case "new_video":
      return `${who} posted a new video in #${n.tags?.label ?? "a tag you follow"}`;
    case "comment":
      return `${who} commented on your video`;
    case "like":
      return `${who} liked your video`;
  }
}

export default function NotificationList({ initial }: { initial: AppNotification[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState(initial);

  // Mark everything read once the page is viewed.
  useEffect(() => {
    const unreadIds = initial.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
      .then(() => {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        router.refresh(); // refresh the navbar badge
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-neutral-400">
        No notifications yet. Follow some tags in{" "}
        <Link href="/settings" className="text-brand hover:underline">
          settings
        </Link>{" "}
        to get alerts about new videos.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-800">
      {items.map((n) => {
        const href = n.videos ? `/watch/${n.videos.id}` : "#";
        return (
          <li key={n.id}>
            <Link
              href={href}
              className={
                "flex items-start gap-3 px-2 py-3 hover:bg-neutral-900 " +
                (n.is_read ? "" : "bg-neutral-900/60")
              }
            >
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              <div className={n.is_read ? "ml-5" : ""}>
                <p className="text-sm">{describe(n)}</p>
                {n.videos?.title && (
                  <p className="text-sm text-neutral-400">“{n.videos.title}”</p>
                )}
                <p className="text-xs text-neutral-500">{timeAgo(n.created_at)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
