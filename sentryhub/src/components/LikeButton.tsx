"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LikeButton({
  videoId,
  initialCount,
  initiallyLiked,
  signedIn,
}: {
  videoId: string;
  initialCount: number;
  initiallyLiked: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [liked, setLiked] = useState(initiallyLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) return router.push("/login");
    if (busy) return;
    setBusy(true);

    // optimistic update
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
      setBusy(false);
      return router.push("/login");
    }

    const { error } = next
      ? await supabase.from("likes").insert({ video_id: videoId, user_id: user.id })
      : await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", user.id);

    if (error) {
      // revert on failure
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      className={
        "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition " +
        (liked
          ? "border-brand bg-brand/10 text-brand"
          : "border-neutral-700 text-neutral-200 hover:border-neutral-500")
      }
    >
      <span>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
