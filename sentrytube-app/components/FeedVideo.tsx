import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { hlsUrl } from "@/lib/mux";
import { formatCount } from "@/lib/format";
import { shareVideo } from "@/lib/share";
import { isBookmarked, isFollowing, toggleBookmark, toggleFollow } from "@/lib/social";
import HlsVideo from "@/components/HlsVideo";
import CommentSheet from "@/components/CommentSheet";
import ReportSheet from "@/components/ReportSheet";
import type { Video as VideoType } from "@/lib/types";

/** Full-screen TikTok-style page: like, comment sheet, share, save, follow, report, unmute. */
export default function FeedVideo({
  video,
  isActive,
  height,
}: {
  video: VideoType;
  isActive: boolean;
  height: number;
}) {
  const { session } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(Platform.OS === "web");
  const [paused, setPaused] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const lastTap = useRef(0);

  const owner = video.profiles;
  const tags = (video.video_tags ?? []).map((t) => t.tags).filter(Boolean).slice(0, 3);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
        supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("video_id", video.id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("video_id", video.id)
          .eq("is_removed", false),
      ]);
      if (!cancelled) {
        setLikes(likeCount ?? 0);
        setComments(commentCount ?? 0);
      }
      if (session) {
        const [{ data: likeRow }, book, foll] = await Promise.all([
          supabase
            .from("likes")
            .select("user_id")
            .eq("video_id", video.id)
            .eq("user_id", session.user.id)
            .maybeSingle(),
          isBookmarked(video.id),
          owner?.id ? isFollowing(owner.id) : Promise.resolve(false),
        ]);
        if (!cancelled) {
          setLiked(!!likeRow);
          setSaved(book);
          setFollowing(foll);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [video.id, session, owner?.id]);

  useEffect(() => {
    if (isActive) {
      supabase.rpc("increment_view", { p_video_id: video.id });
      supabase.from("events").insert({ type: "video_view", video_id: video.id });
      setPaused(false);
    }
  }, [isActive]);

  async function doLike() {
    if (!session) return router.push("/login");
    const next = !liked;
    setLiked(next);
    setLikes((c) => c + (next ? 1 : -1));
    try {
      if (next) await supabase.from("likes").insert({ video_id: video.id, user_id: session.user.id });
      else
        await supabase
          .from("likes")
          .delete()
          .eq("video_id", video.id)
          .eq("user_id", session.user.id);
    } catch {
      setLiked(!next);
      setLikes((c) => c + (next ? -1 : 1));
    }
  }

  function onSurfacePress() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!liked) doLike();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current === now) {
        setPaused((p) => !p);
        if (Platform.OS === "web" && muted) setMuted(false);
      }
    }, 280);
  }

  async function onShare() {
    await shareVideo({ id: video.id, title: video.title, username: owner?.username });
  }

  async function onSave() {
    if (!session) return router.push("/login");
    try {
      const next = await toggleBookmark(video.id, saved);
      setSaved(next);
    } catch {
      /* ignore */
    }
  }

  async function onFollow() {
    if (!session) return router.push("/login");
    if (!owner?.id || owner.id === session.user.id) return;
    try {
      const next = await toggleFollow(owner.id, following);
      setFollowing(next);
    } catch {
      /* ignore */
    }
  }

  return (
    <View style={[styles.page, { height }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onSurfacePress}>
        {video.playback_id ? (
          <HlsVideo
            uri={hlsUrl(video.playback_id)}
            isActive={isActive}
            loop
            contentFit="cover"
            muted={muted}
            paused={paused}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text style={styles.muted}>Processing…</Text>
          </View>
        )}
      </Pressable>

      {paused ? (
        <View pointerEvents="none" style={styles.pauseBadge}>
          <Ionicons name="play" size={48} color="rgba(255,255,255,0.85)" />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={styles.avatarBtn}
          onPress={() => owner?.username && router.push(`/u/${owner.username}`)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(owner?.username ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
          {session && owner?.id && owner.id !== session.user.id ? (
            <Pressable style={[styles.followPlus, following && styles.followPlusOn]} onPress={onFollow}>
              <Ionicons name={following ? "checkmark" : "add"} size={14} color="#fff" />
            </Pressable>
          ) : null}
        </Pressable>

        <Action
          icon={liked ? "heart" : "heart-outline"}
          color={liked ? "#e11d48" : "#fff"}
          label={formatCount(likes)}
          onPress={doLike}
        />
        <Action icon="chatbubble-outline" label={formatCount(comments)} onPress={() => setCommentsOpen(true)} />
        <Action icon="arrow-redo-outline" label="Share" onPress={onShare} />
        <Action
          icon={saved ? "bookmark" : "bookmark-outline"}
          color={saved ? "#fbbf24" : "#fff"}
          label="Save"
          onPress={onSave}
        />
        <Action icon={muted ? "volume-mute" : "volume-high"} label={muted ? "Muted" : "Sound"} onPress={() => setMuted((m) => !m)} />
        <Action icon="flag-outline" label="Report" onPress={() => setReportOpen(true)} />
      </View>

      <View style={styles.meta}>
        <Pressable onPress={() => owner?.username && router.push(`/u/${owner.username}`)}>
          <Text style={styles.author}>@{owner?.username ?? "unknown"}</Text>
        </Pressable>
        <Text style={styles.caption} numberOfLines={2}>
          {video.title}
        </Text>
        <View style={styles.tags}>
          {tags.map((t) => (
            <Text key={t!.id} style={styles.tag}>
              #{t!.label}
            </Text>
          ))}
        </View>
        {video.location ? <Text style={styles.loc}>{video.location}</Text> : null}
        <Text style={styles.views}>{formatCount(video.view_count)} views</Text>
      </View>

      <CommentSheet videoId={video.id} visible={commentsOpen} onClose={() => setCommentsOpen(false)} />
      <ReportSheet videoId={video.id} visible={reportOpen} onClose={() => setReportOpen(false)} />
    </View>
  );
}

function Action({
  icon,
  label,
  color = "#fff",
  onPress,
}: {
  icon: any;
  label: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={30} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", backgroundColor: "#000", justifyContent: "flex-end", position: "relative", overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  muted: { color: "#888" },
  pauseBadge: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  actions: { position: "absolute", right: 10, bottom: 110, alignItems: "center", gap: 16 },
  action: { alignItems: "center", gap: 2 },
  actionLabel: { color: "#fff", fontSize: 11, fontWeight: "600" },
  avatarBtn: { alignItems: "center", marginBottom: 6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  followPlus: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "#e11d48",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  followPlusOn: { backgroundColor: "#444" },
  meta: { position: "absolute", left: 14, right: 80, bottom: 36 },
  author: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 6 },
  caption: { color: "#fff", fontSize: 14, marginBottom: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { color: "#e5e5e5", fontSize: 13, fontWeight: "600" },
  loc: { color: "#bbb", fontSize: 12, marginTop: 6 },
  views: { color: "#888", fontSize: 11, marginTop: 4 },
});
