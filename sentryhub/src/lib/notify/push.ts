import webpush from "web-push";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

// Sends a push to one device. Returns "gone" if the subscription is dead
// (404/410) so the caller can prune it.
export async function sendPush(
  sub: PushSub,
  payload: { title: string; body: string; url: string; tag?: string }
): Promise<"ok" | "gone" | "skip" | "error"> {
  if (!ensureConfigured()) return "skip";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err: unknown) {
    const code = (err as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return "gone";
    return "error";
  }
}
