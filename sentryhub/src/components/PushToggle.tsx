"use client";

import { useEffect, useState } from "react";

// Converts a base64url VAPID key to the Uint8Array the Push API wants.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "default" | "granted" | "denied" | "busy";

export default function PushToggle() {
  const [state, setState] = useState<State>("default");
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as State);
  }, []);

  async function enable() {
    if (!vapid) {
      alert("Push is not configured (missing VAPID public key).");
      return;
    }
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      setState("granted");
    } catch {
      setState("default");
    }
  }

  if (state === "unsupported") {
    return <p className="text-sm text-neutral-500">Push notifications aren&apos;t supported in this browser.</p>;
  }
  if (state === "granted") {
    return <p className="text-sm text-green-400">✓ Push notifications enabled on this device.</p>;
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-neutral-500">
        Push is blocked. Enable notifications for this site in your browser settings.
      </p>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "busy"}
      className="rounded-md border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500 disabled:opacity-50"
    >
      {state === "busy" ? "Enabling…" : "Enable push on this device"}
    </button>
  );
}
