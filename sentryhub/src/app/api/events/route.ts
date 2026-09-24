import { NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/request";
import { optionsResponse, withCors } from "@/lib/api/cors";

type IncomingEvent = {
  type: "video_view" | "watch_progress" | "ad_impression" | "ad_click";
  videoId?: string | null;
  adId?: string | null;
  value?: number | null;
  meta?: Record<string, unknown> | null;
};

const TYPES = ["video_view", "watch_progress", "ad_impression", "ad_click"];

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  const supabase = createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json().catch(() => null);
  if (!body) {
    return withCors(request, NextResponse.json({ error: "Bad body" }, { status: 400 }));
  }

  const incoming: IncomingEvent[] = Array.isArray(body.events)
    ? body.events
    : [body as IncomingEvent];

  const rows = incoming
    .filter((e) => TYPES.includes(e.type))
    .slice(0, 50)
    .map((e) => ({
      type: e.type,
      user_id: user?.id ?? null,
      video_id: e.videoId ?? null,
      ad_id: e.adId ?? null,
      value: typeof e.value === "number" ? e.value : null,
      meta: e.meta ?? null,
    }));

  if (rows.length === 0) return withCors(request, NextResponse.json({ ok: true }));

  const { error } = await supabase.from("events").insert(rows);
  if (error) {
    return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }));
  }
  return withCors(request, NextResponse.json({ ok: true, count: rows.length }));
}
