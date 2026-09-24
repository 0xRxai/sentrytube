import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { registerForPush } from "@/lib/push";

// Registers the device for push when logged in, and routes taps to the video.
export default function NotificationsBridge() {
  const { session } = useAuth();
  const registered = useRef<string | null>(null);

  // Register (once per user) when a session is present.
  useEffect(() => {
    const uid = session?.user.id;
    if (uid && registered.current !== uid) {
      registered.current = uid;
      registerForPush(uid).catch(() => {});
    }
  }, [session]);

  // Navigate when the user taps a notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { url?: string; videoId?: string };
      if (data?.url) router.push(data.url as any);
      else if (data?.videoId) router.push(`/watch/${data.videoId}`);
      else router.push("/notifications");
    });
    return () => sub.remove();
  }, []);

  return null;
}
