import { supabase } from "./supabase";

export async function toggleFollow(targetUserId: string, currentlyFollowing: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  if (currentlyFollowing) {
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
    return false;
  }
  await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetUserId });
  return true;
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return !!data;
}

export async function toggleBookmark(videoId: string, saved: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("auth");
  if (saved) {
    await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("video_id", videoId);
    return false;
  }
  await supabase.from("bookmarks").insert({ user_id: user.id, video_id: videoId });
  return true;
}

export async function isBookmarked(videoId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("video_id")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .maybeSingle();
  return !!data;
}

export async function followingIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
  return (data ?? []).map((r) => r.following_id);
}
