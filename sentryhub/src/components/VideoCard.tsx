import Link from "next/link";
import type { VideoWithOwner } from "@/lib/types";
import { thumbnailFor, timeAgo, formatViews, formatDuration } from "@/lib/format";

export default function VideoCard({ video }: { video: VideoWithOwner }) {
  const owner = video.profiles;
  const thumb = thumbnailFor(video);
  const ready = video.status === "ready";
  const dur = formatDuration(video.duration_seconds);
  const tags = (video.video_tags ?? [])
    .map((vt) => vt.tags)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .slice(0, 3);

  return (
    <Link href={`/watch/${video.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-900">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={video.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            {ready ? "No preview" : "Processing…"}
          </div>
        )}
        {dur && ready && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs">
            {dur}
          </span>
        )}
        {!ready && (
          <span className="absolute left-1.5 top-1.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-xs font-medium text-black">
            {video.status === "errored" ? "Failed" : "Processing"}
          </span>
        )}
      </div>
      <div className="mt-2">
        <h3 className="line-clamp-2 font-medium leading-snug">{video.title}</h3>
        <p className="mt-0.5 text-sm text-neutral-400">
          {owner ? `@${owner.username}` : "unknown"} · {formatViews(video.view_count)} views ·{" "}
          {timeAgo(video.created_at)}
        </p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
              >
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
