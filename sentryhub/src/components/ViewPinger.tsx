"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Fires an atomic view increment once per mount.
export default function ViewPinger({ videoId }: { videoId: string }) {
  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("increment_view", { p_video_id: videoId });
  }, [videoId]);
  return null;
}
