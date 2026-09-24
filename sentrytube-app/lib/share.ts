import { Share, Platform } from "react-native";
import { API_BASE_URL } from "./config";

/** Share / forward a video — native sheet on iOS/Android, Web Share API on browser. */
export async function shareVideo(opts: { id: string; title: string; username?: string | null }) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/watch/${opts.id}`;
  const message = opts.username
    ? `Check out @${opts.username} on SentryTube: ${opts.title}`
    : `Check this out on SentryTube: ${opts.title}`;

  if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: opts.title, text: message, url });
      return;
    } catch {
      /* user cancelled or unsupported — fall through */
    }
  }

  await Share.share(
    Platform.OS === "ios"
      ? { url, message: `${message}\n${url}` }
      : { message: `${message}\n${url}`, title: opts.title }
  );
}
