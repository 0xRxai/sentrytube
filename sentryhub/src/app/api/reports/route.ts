import { NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/request";
import { optionsResponse, withCors } from "@/lib/api/cors";

const REASONS = ["illegal", "harassment", "spam", "privacy", "other"];

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

// File a report against a video or comment. Cookie or Bearer auth.
export async function POST(request: Request) {
  const supabase = createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return withCors(request, NextResponse.json({ error: "Not authenticated" }, { status: 401 }));
  }

  const { targetType, videoId, commentId, reason, details } = await request.json();

  if (!["video", "comment"].includes(targetType)) {
    return withCors(request, NextResponse.json({ error: "Invalid target" }, { status: 400 }));
  }
  if (!REASONS.includes(reason)) {
    return withCors(request, NextResponse.json({ error: "Invalid reason" }, { status: 400 }));
  }
  if (targetType === "video" && !videoId) {
    return withCors(request, NextResponse.json({ error: "Missing video" }, { status: 400 }));
  }
  if (targetType === "comment" && !commentId) {
    return withCors(request, NextResponse.json({ error: "Missing comment" }, { status: 400 }));
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    video_id: targetType === "video" ? videoId : null,
    comment_id: targetType === "comment" ? commentId : null,
    reason,
    details: details?.slice(0, 1000) || null,
  });

  if (error && !error.message.includes("duplicate")) {
    return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return withCors(request, NextResponse.json({ ok: true }));
}
