import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderNotification } from "@/lib/notify/messages";
import { sendNotificationEmail } from "@/lib/notify/email";
import { sendPush } from "@/lib/notify/push";
import { sendExpoPush } from "@/lib/notify/expoPush";
import type { NotificationType } from "@/lib/types";

// Called by a Supabase Database Webhook on INSERT into public.notifications.
// Fans the row out to email + web push. Preference gating already happened in
// the DB trigger that created the row, so we just deliver.
export async function POST(request: Request) {
  // Shared-secret check (configured as a custom header on the Supabase webhook).
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.NOTIFY_WEBHOOK_SECRET || secret !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const record = payload.record as {
    id: string;
    user_id: string;
    type: NotificationType;
    actor_id: string | null;
    video_id: string | null;
    tag_id: string | null;
  };
  if (!record?.user_id) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Enrich: actor name, video title, tag label, recipient email + push subs.
  const [actorRes, videoRes, tagRes, userRes, subsRes, deviceTokensRes] = await Promise.all([
    record.actor_id
      ? admin.from("profiles").select("username, display_name").eq("id", record.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    record.video_id
      ? admin.from("videos").select("title").eq("id", record.video_id).maybeSingle()
      : Promise.resolve({ data: null }),
    record.tag_id
      ? admin.from("tags").select("label").eq("id", record.tag_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.auth.admin.getUserById(record.user_id),
    admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", record.user_id),
    admin.from("device_tokens").select("token").eq("user_id", record.user_id),
  ]);

  const msg = renderNotification({
    type: record.type,
    actorName:
      actorRes.data?.display_name ?? actorRes.data?.username ?? "Someone",
    videoTitle: videoRes.data?.title ?? null,
    tagLabel: tagRes.data?.label ?? null,
    videoId: record.video_id,
  });

  const tasks: Promise<unknown>[] = [];

  // Email
  const email = userRes.data?.user?.email;
  if (email) {
    tasks.push(sendNotificationEmail({ to: email, ...msg }));
  }

  // Web push (prune dead subscriptions)
  for (const sub of subsRes.data ?? []) {
    tasks.push(
      sendPush(sub, { ...msg, tag: record.video_id ?? record.id }).then((r) => {
        if (r === "gone") {
          return admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      })
    );
  }

  // Native push (Expo) — one batched call; prune tokens Expo rejects.
  const deviceTokens = (deviceTokensRes.data ?? []).map((d: { token: string }) => d.token);
  if (deviceTokens.length > 0) {
    tasks.push(
      sendExpoPush(
        deviceTokens.map((token: string) => ({
          to: token,
          title: msg.title,
          body: msg.body,
          data: { url: msg.url, videoId: record.video_id },
        }))
      ).then((invalid) => {
        if (invalid.length > 0) {
          return admin.from("device_tokens").delete().in("token", invalid);
        }
      })
    );
  }

  await Promise.allSettled(tasks);
  return NextResponse.json({ ok: true });
}
