import { NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/request";
import { getVideoProvider } from "@/lib/video";
import { muxCorsOrigin, optionsResponse, withCors } from "@/lib/api/cors";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

// Creates a video row (status=uploading) + a provider direct-upload session.
// Supports cookie auth (Next.js) and Bearer JWT (Expo). Core video provider stays untouched.
export async function POST(request: Request) {
  const supabase = createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return withCors(request, NextResponse.json({ error: "Not authenticated" }, { status: 401 }));
  }

  const body = await request.json();
  const { title, description, location, eventDate, tagIds } = body as {
    title: string;
    description?: string;
    location?: string;
    eventDate?: string;
    tagIds?: string[];
  };

  if (!title?.trim()) {
    return withCors(request, NextResponse.json({ error: "Title is required" }, { status: 400 }));
  }

  const provider = getVideoProvider();

  const { data: video, error: insErr } = await supabase
    .from("videos")
    .insert({
      owner_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      event_date: eventDate || null,
      provider: provider.name,
      status: "uploading",
    })
    .select("id")
    .single();
  if (insErr || !video) {
    return withCors(
      request,
      NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 })
    );
  }

  if (tagIds?.length) {
    await supabase
      .from("video_tags")
      .insert(tagIds.map((tag_id) => ({ video_id: video.id, tag_id })));
  }

  try {
    const { uploadId, uploadUrl } = await provider.createUpload({
      corsOrigin: muxCorsOrigin(request),
      passthrough: video.id,
    });
    await supabase.from("videos").update({ upload_id: uploadId }).eq("id", video.id);
    return withCors(request, NextResponse.json({ videoId: video.id, uploadUrl }));
  } catch (err) {
    await supabase.from("videos").delete().eq("id", video.id);
    const message = err instanceof Error ? err.message : "Provider error";
    return withCors(request, NextResponse.json({ error: message }, { status: 502 }));
  }
}
