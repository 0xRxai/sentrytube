import { useEffect, useRef } from "react";
import { ResizeMode, Video, Audio } from "expo-av";
import { StyleSheet } from "react-native";

// Native (iOS/Android) HLS player. expo-av plays Mux HLS natively.
// A matching `.web.tsx` handles browsers via hls.js. Same props on both.
export type HlsVideoProps = {
  uri: string;
  isActive?: boolean;
  loop?: boolean;
  controls?: boolean;
  contentFit?: "cover" | "contain";
  /** When true, audio is muted (required for browser autoplay). */
  muted?: boolean;
  paused?: boolean;
};

export default function HlsVideo({
  uri,
  isActive = true,
  loop = false,
  controls = false,
  contentFit = "cover",
  muted = false,
  paused = false,
}: HlsVideoProps) {
  const ref = useRef<Video>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.setIsMutedAsync(muted).catch(() => {});
  }, [muted]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive && !paused) v.playAsync().catch(() => {});
    else v.pauseAsync().catch(() => {});
  }, [isActive, paused]);

  return (
    <Video
      ref={ref}
      style={StyleSheet.absoluteFill}
      source={{ uri }}
      resizeMode={contentFit === "cover" ? ResizeMode.COVER : ResizeMode.CONTAIN}
      isLooping={loop}
      shouldPlay={isActive && !paused}
      isMuted={muted}
      useNativeControls={controls}
    />
  );
}
