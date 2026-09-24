import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timeAgo, formatViews } from "@/lib/format";
import VideoPlayer from "@/components/VideoPlayer";
import ProcessingNotice from "@/components/ProcessingNotice";
import LikeButton from "@/components/LikeButton";
import Comments from "@/components/Comments";
import WatchTracker from "@/components/WatchTracker";
import ReportButton from "@/components/ReportButton";
import AdSlot from "@/components/AdSlot";
import type { VideoWithOwner, Comment } from "@/lib/types";

export default async function WatchPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: video } = await supabase
    .from("videos")
    .select("*, profiles(id, username, display_name, avatar_url), video_tags(tags(*))")
    .eq("id", params.id)
    .single<VideoWithOwner>();

  if (!video) notFound();

  const ready = video.status === "ready" && video.playback_id;

  const [{ count: likeCount }, likedRes, { data: rawComments }] = await Promise.all([
    supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("video_id", video.id),
    user
      ? supabase.from("likes").select("user_id").eq("video_id", video.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("comments")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("video_id", video.id)
      .order("created_at", { ascending: false }),
  ]);

  const tags = (video.video_tags ?? [])
    .map((vt) => vt.tags)
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="mx-auto max-w-4xl">
      {ready ? (
        <>
          <WatchTracker videoId={video.id} />
          <VideoPlayer playbackId={video.playback_id!} title={video.title} />
        </>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-neutral-900 text-center">
          {video.status === "errored" ? (
            <p className="text-red-400">This video failed to process.</p>
          ) : (
            <>
              <p className="text-neutral-300">Your video is processing…</p>
              <p className="mt-1 text-sm text-neutral-500">
                Transcoding usually takes under a minute. This page updates automatically.
              </p>
              <ProcessingNotice />
            </>
          )}
        </div>
      )}

      <h1 className="mt-4 text-xl font-bold">{video.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
        <span>{formatViews(video.view_count)} views</span>
        <span>·</span>
        <span>{timeAgo(video.created_at)}</span>
        {video.location && (
          <>
            <span>·</span>
            <span>📍 {video.location}</span>
          </>
        )}
        <div className="ml-auto">
          <LikeButton
            videoId={video.id}
            initialCount={likeCount ?? 0}
            initiallyLiked={!!likedRes.data}
            signedIn={!!user}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-y border-neutral-800 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 font-bold">
          {(video.profiles?.display_name ?? video.profiles?.username ?? "?")
            .charAt(0)
            .toUpperCase()}
        </div>
        <Link href={`/profile/${video.profiles?.username}`} className="font-medium hover:underline">
          {video.profiles?.display_name ?? video.profiles?.username}
        </Link>
        <div className="ml-auto">
          <ReportButton targetType="video" videoId={video.id} signedIn={!!user} />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/?tag=${t.slug}`}
              className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              #{t.label}
            </Link>
          ))}
        </div>
      )}

      {video.description && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-200">{video.description}</p>
      )}

      <div className="mt-6 max-w-md">
        <AdSlot placement="feed" tag={tags[0]?.slug} />
      </div>

      <Comments
        videoId={video.id}
        initialComments={(rawComments as Comment[]) ?? []}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
