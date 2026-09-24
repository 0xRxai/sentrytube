"use client";

import MuxPlayer from "@mux/mux-player-react";

// Adaptive-bitrate HLS player. Provider-agnostic at the call site: the watch
// page just passes a playbackId. (If you switch providers, swap this one file.)
export default function VideoPlayer({
  playbackId,
  title,
}: {
  playbackId: string;
  title: string;
}) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{ video_title: title }}
      streamType="on-demand"
      autoPlay
      accentColor="#e11d48"
      style={{ aspectRatio: "16 / 9", width: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
    />
  );
}
