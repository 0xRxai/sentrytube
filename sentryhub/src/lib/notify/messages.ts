import type { NotificationType } from "@/lib/types";

export type NotifContext = {
  type: NotificationType;
  actorName: string;
  videoTitle: string | null;
  tagLabel: string | null;
  videoId: string | null;
};

// One place that turns a notification into human text, reused by in-app,
// email, and push so wording stays consistent.
export function renderNotification(ctx: NotifContext): {
  title: string;
  body: string;
  url: string;
} {
  const who = ctx.actorName || "Someone";
  const url = ctx.videoId ? `/watch/${ctx.videoId}` : "/";

  switch (ctx.type) {
    case "new_video":
      return {
        title: `New video in #${ctx.tagLabel ?? "a tag you follow"}`,
        body: `${who} just posted${ctx.videoTitle ? `: “${ctx.videoTitle}”` : " a new clip."}`,
        url,
      };
    case "comment":
      return {
        title: "New comment on your video",
        body: `${who} commented${ctx.videoTitle ? ` on “${ctx.videoTitle}”` : " on your video."}`,
        url,
      };
    case "like":
      return {
        title: "Someone liked your video",
        body: `${who} liked${ctx.videoTitle ? ` “${ctx.videoTitle}”` : " your video."}`,
        url,
      };
  }
}
