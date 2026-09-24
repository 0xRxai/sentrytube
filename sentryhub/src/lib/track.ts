"use client";

type TrackPayload = {
  type: "video_view" | "watch_progress" | "ad_impression" | "ad_click";
  videoId?: string;
  adId?: string;
  value?: number;
  meta?: Record<string, unknown>;
};

// Fire-and-forget analytics. Uses sendBeacon when available (survives unload).
export function track(payload: TrackPayload) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // analytics must never break the page
  }
}
