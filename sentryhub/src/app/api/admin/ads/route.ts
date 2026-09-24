import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";

// Admin-only ads management. One endpoint, several actions.
export async function POST(request: Request) {
  const { error, supabase, userId } = await requireRole("admin");
  if (error) return NextResponse.json({ error: "Forbidden" }, { status: error });

  const body = await request.json();
  const action = body.action as string;

  if (action === "create_campaign") {
    const { name, advertiser } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const { data, error: e } = await supabase!
      .from("ad_campaigns")
      .insert({ name, advertiser: advertiser || null, created_by: userId })
      .select("id")
      .single();
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data!.id });
  }

  if (action === "create_ad") {
    const { campaignId, title, bodyText, imageUrl, targetUrl, placement, weight } = body;
    if (!campaignId || !title || !targetUrl || !placement) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const { error: e } = await supabase!.from("ads").insert({
      campaign_id: campaignId,
      title,
      body: bodyText || null,
      image_url: imageUrl || null,
      target_url: targetUrl,
      placement,
      weight: Number(weight) || 1,
    });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle_ad") {
    const { adId, active } = body;
    const { error: e } = await supabase!.from("ads").update({ active: !!active }).eq("id", adId);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "set_campaign_status") {
    const { campaignId, status } = body;
    if (!["active", "paused", "ended"].includes(status)) {
      return NextResponse.json({ error: "Bad status" }, { status: 400 });
    }
    const { error: e } = await supabase!
      .from("ad_campaigns")
      .update({ status })
      .eq("id", campaignId);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
