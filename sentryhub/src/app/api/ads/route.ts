import { NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/request";
import { optionsResponse, withCors } from "@/lib/api/cors";
import type { AdPlacement } from "@/lib/types";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

// Serves a single house ad for a placement, honoring campaign status/dates,
// optional tag targeting, weighting, and the per-user "no_ads" entitlement.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placement = (searchParams.get("placement") ?? "sidebar") as AdPlacement;
  const tag = searchParams.get("tag");

  const supabase = createClientFromRequest(request);

  // Respect ad-free entitlement for signed-in supporters/admins.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: noAds } = await supabase.rpc("has_feature", { p_key: "no_ads" });
    if (noAds === true) return withCors(request, NextResponse.json({ ad: null }));
  }

  const nowIso = new Date().toISOString();

  // Active ads in this placement, from active campaigns within their date window.
  const { data: ads } = await supabase
    .from("ads")
    .select(
      "id, title, body, image_url, target_url, placement, weight, " +
        "ad_campaigns!inner(status, starts_at, ends_at), ad_targets(tag_id, tags(slug))"
    )
    .eq("active", true)
    .eq("placement", placement)
    .eq("ad_campaigns.status", "active");

  let candidates = (ads ?? []).filter((a: any) => {
    const c = a.ad_campaigns;
    if (c.starts_at && c.starts_at > nowIso) return false;
    if (c.ends_at && c.ends_at < nowIso) return false;
    // Targeting: if the ad has targets, the current tag must match one.
    const targets: string[] = (a.ad_targets ?? [])
      .map((t: any) => t.tags?.slug)
      .filter(Boolean);
    if (targets.length > 0) return tag ? targets.includes(tag) : false;
    return true;
  });

  if (candidates.length === 0) return withCors(request, NextResponse.json({ ad: null }));

  // Weighted random selection.
  const total = candidates.reduce((s, a: any) => s + Math.max(1, a.weight), 0);
  let r = Math.random() * total;
  let chosen: any = candidates[0];
  for (const a of candidates) {
    r -= Math.max(1, (a as any).weight);
    if (r <= 0) {
      chosen = a;
      break;
    }
  }

  return withCors(
    request,
    NextResponse.json({
      ad: {
        id: chosen.id,
        title: chosen.title,
        body: chosen.body,
        image_url: chosen.image_url,
        target_url: chosen.target_url,
        placement: chosen.placement,
      },
    })
  );
}
