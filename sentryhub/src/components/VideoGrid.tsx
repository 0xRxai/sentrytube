import type { VideoWithOwner } from "@/lib/types";
import VideoCard from "./VideoCard";

export default function VideoGrid({ videos }: { videos: VideoWithOwner[] }) {
  if (videos.length === 0) {
    return <p className="text-neutral-400">No videos yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
