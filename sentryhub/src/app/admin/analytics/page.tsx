import { createClient } from "@/lib/supabase/server";
import StatCards from "@/components/StatCards";
import { formatViews, formatWatchTime } from "@/lib/format";

export default async function AdminAnalyticsPage() {
  const supabase = createClient();

  const [{ data: overviewRows }, { data: adRows }] = await Promise.all([
    supabase.rpc("admin_platform_overview"),
    supabase.rpc("ad_overview"),
  ]);

  const o = overviewRows?.[0] ?? {};
  const ads = (adRows as
    | { ad_id: string; title: string; placement: string; impressions: number; clicks: number }[]
    | null) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Platform analytics</h1>

      <StatCards
        stats={[
          { label: "Users", value: o.total_users ?? 0 },
          { label: "Videos", value: o.total_videos ?? 0 },
          { label: "Total views", value: formatViews(o.total_views ?? 0) },
          { label: "Watch time", value: formatWatchTime(o.watch_seconds ?? 0) },
          { label: "Open reports", value: o.open_reports ?? 0 },
          { label: "Active ads", value: o.active_ads ?? 0 },
        ]}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Ad performance</h2>
      {ads.length === 0 ? (
        <p className="text-neutral-400">No ad data yet (admin only).</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="p-3">Ad</th>
                <th className="p-3">Placement</th>
                <th className="p-3 text-right">Impressions</th>
                <th className="p-3 text-right">Clicks</th>
                <th className="p-3 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => {
                const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
                return (
                  <tr key={a.ad_id} className="border-t border-neutral-800">
                    <td className="p-3 font-medium">{a.title}</td>
                    <td className="p-3 text-neutral-400">{a.placement}</td>
                    <td className="p-3 text-right">{a.impressions}</td>
                    <td className="p-3 text-right">{a.clicks}</td>
                    <td className="p-3 text-right">{ctr.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
