import type { VideoProvider } from "./provider";
import { muxProvider } from "./mux";
import { cloudflareProvider } from "./cloudflare";

// Single switch point. Set VIDEO_PROVIDER in env (defaults to mux).
export function getVideoProvider(): VideoProvider {
  const choice = (process.env.VIDEO_PROVIDER ?? "mux").toLowerCase();
  switch (choice) {
    case "cloudflare":
      return cloudflareProvider;
    case "mux":
    default:
      return muxProvider;
  }
}

export type { VideoProvider } from "./provider";
