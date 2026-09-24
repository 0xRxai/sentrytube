import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VideoGrid from "@/components/VideoGrid";
import type { VideoWithOwner } from "@/lib/types";

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  const { data: videos } = await supabase
    .from("videos")
    .select(
      "*, profiles(id, username, display_name, avatar_url), video_tags(tags(*))"
    )
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-2xl font-bold">
          {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-neutral-400">@{profile.username}</p>
          {profile.bio && <p className="mt-1 text-sm text-neutral-300">{profile.bio}</p>}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Uploads</h2>
      <VideoGrid videos={(videos as VideoWithOwner[]) ?? []} />
    </div>
  );
}
