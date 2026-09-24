import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Admin-only moderation actions. RLS already restricts the writes to admins,
// but we also check explicitly so non-admins get a clean 403.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const staff = me?.role === "moderator" || me?.role === "admin";
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId, action } = await request.json();
  if (!reportId || !["remove", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("id, target_type, video_id, comment_id")
    .eq("id", reportId)
    .single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  // Apply the content action.
  if (action === "remove") {
    if (report.target_type === "video" && report.video_id) {
      await supabase
        .from("videos")
        .update({ moderation_status: "removed" })
        .eq("id", report.video_id);
    } else if (report.target_type === "comment" && report.comment_id) {
      await supabase
        .from("comments")
        .update({ is_removed: true })
        .eq("id", report.comment_id);
    }
  }

  // Resolve THIS report and any other open reports on the same target.
  const resolution = action === "remove" ? "actioned" : "dismissed";
  const patch = {
    status: resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  };

  let q = supabase.from("reports").update(patch).eq("status", "open");
  if (report.target_type === "video") q = q.eq("video_id", report.video_id);
  else q = q.eq("comment_id", report.comment_id);
  await q;

  return NextResponse.json({ ok: true });
}
