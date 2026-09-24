import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, isAdmin } from "@/lib/auth";
import AdManager from "@/components/AdManager";
import type { Ad, AdCampaign } from "@/lib/types";

export default async function AdminAdsPage() {
  const session = await getSession();
  if (!isAdmin(session.role)) redirect("/admin");

  const supabase = createClient();
  const [{ data: campaigns }, { data: ads }] = await Promise.all([
    supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("ads").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Ads</h1>
      <p className="mb-6 text-neutral-400">
        Create house-ad campaigns and place ads in the feed, sidebar, or pre-roll.
        Impressions and clicks are tracked automatically — see Analytics.
      </p>
      <AdManager
        campaigns={(campaigns as AdCampaign[]) ?? []}
        ads={(ads as Ad[]) ?? []}
      />
    </div>
  );
}
