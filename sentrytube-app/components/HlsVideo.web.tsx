import { useEffect, useRef } from "react";
import Hls from "hls.js";
import type { HlsVideoProps } from "./HlsVideo";

// Web HLS player. Safari plays HLS natively; Chrome/Firefox/Edge use hls.js.
export default function HlsVideo({
  uri,
  isActive = true,
  loop = false,
  controls = false,
  contentFit = "cover",
  muted = true,
  paused = false,
}: HlsVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = uri;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(uri);
      hls.attachMedia(video);
    } else {
      video.src = uri;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [uri]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (isActive && !paused) video.play().catch(() => {});
    else video.pause();
  }, [isActive, paused]);

  return (
    <video
      ref={ref}
      loop={loop}
      controls={controls}
      muted={muted}
      playsInline
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: contentFit,
        backgroundColor: "#000",
      }}
    />
  );
}
