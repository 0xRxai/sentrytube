import type { Video } from "./types";

// Thumbnail for a video. Uses an explicit override if set, otherwise derives a
// Mux poster image from the playback id. Returns null when not yet available.
export function thumbnailFor(video: Pick<Video, "thumbnail_url" | "playback_id">): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  if (video.playback_id)
    return `https://image.mux.com/${video.playback_id}/thumbnail.jpg?time=1&width=640`;
  return null;
}

// HLS playback URL for a Mux playback id (mux-player can also take the id directly).
export function hlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatViews(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// Human watch time from seconds, e.g. "3.2h" / "14m" / "45s".
export function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
