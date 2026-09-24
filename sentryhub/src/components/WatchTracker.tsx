"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";

// Logs a view on mount and approximate watch time while the tab is visible.
// Watch time is sampled every PING seconds (only when visible), then flushed.
const PING = 10;

export default function WatchTracker({ videoId }: { videoId: string }) {
  const accrued = useRef(0);

  useEffect(() => {
    // View: bump the counter (RPC) + log an analytics event.
    const supabase = createClient();
    supabase.rpc("increment_view", { p_video_id: videoId });
    track({ type: "video_view", videoId });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") accrued.current += PING;
    }, PING * 1000);

    const flush = () => {
      if (accrued.current > 0) {
        track({ type: "watch_progress", videoId, value: accrued.current });
        accrued.current = 0;
      }
    };
    // Flush periodically and on leaving the page.
    const flushInterval = setInterval(flush, PING * 3 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(interval);
      clearInterval(flushInterval);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return null;
}
