import { createClient } from "@/lib/supabase/server";
import VideoGrid from "@/components/VideoGrid";
import SearchBar from "@/components/SearchBar";
import TagFilter from "@/components/TagFilter";
import AdSlot from "@/components/AdSlot";
import type { VideoWithOwner, CategoryWithTags } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim();
  const tag = searchParams.tag;

  const { data: categories } = await supabase
    .from("tag_categories")
    .select("*, tags(*)")
    .order("sort");

  // Only show fully-processed videos in the feed.
  // Tag filter uses an inner join; the default feed uses a left join so
  // untagged videos still appear.
  const selectWithTags =
    "*, profiles(id, username, display_name, avatar_url), video_tags(tags(*))";
  const selectFilterTag =
    "*, profiles(id, username, display_name, avatar_url), video_tags!inner(tags!inner(*))";

  let query = tag
    ? supabase
        .from("videos")
        .select(selectFilterTag)
        .eq("status", "ready")
        .eq("moderation_status", "active")
        .eq("video_tags.tags.slug", tag)
        .order("created_at", { ascending: false })
        .limit(48)
    : supabase
        .from("videos")
        .select(selectWithTags)
        .eq("status", "ready")
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false })
        .limit(48);

  // Text search across title/description/location.
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data: videos } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Latest Sentry footage</h1>
        <p className="text-neutral-400">
          Browse community-shared Tesla Sentry &amp; Dashcam clips.
        </p>
      </div>

      <SearchBar defaultValue={q ?? ""} />
      <TagFilter categories={(categories as CategoryWithTags[]) ?? []} active={tag ?? null} />

      <div className="mt-6 max-w-md">
        <AdSlot placement="feed" tag={tag ?? undefined} />
      </div>

      <div className="mt-6">
        <VideoGrid videos={(videos as VideoWithOwner[]) ?? []} />
      </div>
    </div>
  );
}
