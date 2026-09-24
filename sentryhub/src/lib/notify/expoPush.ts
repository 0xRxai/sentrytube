// Sends push notifications to Expo (native iOS/Android) devices via Expo's
// push service. No SDK needed — a single HTTPS call. Tokens come from the
// `device_tokens` table (populated by the mobile app).

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Sends a batch of messages. Returns the tokens Expo reports as invalid
// (DeviceNotRegistered) so the caller can prune them.
export async function sendExpoPush(messages: ExpoMessage[]): Promise<string[]> {
  if (messages.length === 0) return [];
  const invalid: string[] = [];

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    (json.data ?? []).forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalid.push(messages[i].to);
      }
    });
  } catch {
    // Push must never break the dispatch pipeline.
  }
  return invalid;
}
