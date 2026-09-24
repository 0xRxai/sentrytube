import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatCards from "@/components/StatCards";
import { formatViews, formatWatchTime, timeAgo } from "@/lib/format";
import type { CreatorVideoStat } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: overviewRows }, { data: breakdown }] = await Promise.all([
    supabase.rpc("creator_overview"),
    supabase.rpc("creator_video_breakdown"),
  ]);

  const o = overviewRows?.[0] ?? {
    videos: 0,
    views: 0,
    watch_seconds: 0,
    likes: 0,
    comments: 0,
  };
  const videos = (breakdown as CreatorVideoStat[]) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator dashboard</h1>
        <Link
          href="/upload"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Upload
        </Link>
      </div>

      <StatCards
        stats={[
          { label: "Videos", value: o.videos },
          { label: "Total views", value: formatViews(o.views) },
          { label: "Watch time", value: formatWatchTime(o.watch_seconds) },
          { label: "Likes", value: o.likes },
          { label: "Comments", value: o.comments },
        ]}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Your videos</h2>
      {videos.length === 0 ? (
        <p className="text-neutral-400">
          You haven&apos;t uploaded anything yet.{" "}
          <Link href="/upload" className="text-brand hover:underline">
            Upload your first clip.
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="p-3">Video</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Watch</th>
                <th className="p-3 text-right">Likes</th>
                <th className="p-3 text-right">Comments</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.video_id} className="border-t border-neutral-800">
                  <td className="p-3">
                    <Link href={`/watch/${v.video_id}`} className="font-medium hover:underline">
                      {v.title}
                    </Link>
                    <div className="text-xs text-neutral-500">{timeAgo(v.created_at)}</div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={v.status} moderation={v.moderation_status} />
                  </td>
                  <td className="p-3 text-right">{formatViews(v.views)}</td>
                  <td className="p-3 text-right">{formatWatchTime(v.watch_seconds)}</td>
                  <td className="p-3 text-right">{v.likes}</td>
                  <td className="p-3 text-right">{v.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, moderation }: { status: string; moderation: string }) {
  if (moderation === "removed")
    return <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Removed</span>;
  if (status === "ready")
    return <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-300">Live</span>;
  if (status === "errored")
    return <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Failed</span>;
  return <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">Processing</span>;
}
