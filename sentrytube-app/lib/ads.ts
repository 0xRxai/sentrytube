import { supabase } from "./supabase";

export type ServedAd = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
};

// Client-side house-ad selection. Ads / campaigns / targets are public-readable
// via RLS, so the app can pick one directly — no backend endpoint needed.
export async function fetchAd(
  placement: "feed" | "sidebar" | "preroll",
  tag?: string
): Promise<ServedAd | null> {
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("ads")
    .select("id, title, body, image_url, target_url, weight, ad_campaigns!inner(status, starts_at, ends_at), ad_targets(tags(slug))")
    .eq("active", true)
    .eq("placement", placement)
    .eq("ad_campaigns.status", "active");

  const candidates = (data ?? []).filter((a: any) => {
    const c = a.ad_campaigns;
    if (c.starts_at && c.starts_at > nowIso) return false;
    if (c.ends_at && c.ends_at < nowIso) return false;
    const targets: string[] = (a.ad_targets ?? []).map((t: any) => t.tags?.slug).filter(Boolean);
    if (targets.length > 0) return tag ? targets.includes(tag) : false;
    return true;
  });

  if (candidates.length === 0) return null;

  const total = candidates.reduce((s: number, a: any) => s + Math.max(1, a.weight), 0);
  let r = Math.random() * total;
  let chosen: any = candidates[0];
  for (const a of candidates) {
    r -= Math.max(1, a.weight);
    if (r <= 0) {
      chosen = a;
      break;
    }
  }
  return {
    id: chosen.id,
    title: chosen.title,
    body: chosen.body,
    image_url: chosen.image_url,
    target_url: chosen.target_url,
  };
}

// Returns all currently-eligible ads for a placement (used to interleave the
// vertical feed). Same eligibility rules as fetchAd, minus the weighted pick.
export async function fetchAds(
  placement: "feed" | "sidebar" | "preroll"
): Promise<ServedAd[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("ads")
    .select("id, title, body, image_url, target_url, ad_campaigns!inner(status, starts_at, ends_at), ad_targets(tags(slug))")
    .eq("active", true)
    .eq("placement", placement)
    .eq("ad_campaigns.status", "active");

  return (data ?? [])
    .filter((a: any) => {
      const c = a.ad_campaigns;
      if (c.starts_at && c.starts_at > nowIso) return false;
      if (c.ends_at && c.ends_at < nowIso) return false;
      // Only untargeted ads for the general feed (targeted ads show on their tag).
      return (a.ad_targets ?? []).length === 0;
    })
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      image_url: a.image_url,
      target_url: a.target_url,
    }));
}

// Fire-and-forget ad event (anonymous events allowed by RLS).
export function logAdEvent(type: "ad_impression" | "ad_click", adId: string) {
  supabase.from("events").insert({ type, ad_id: adId }).then(() => {});
}
