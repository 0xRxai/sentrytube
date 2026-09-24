import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import FeedVideo from "@/components/FeedVideo";
import FeedAd from "@/components/FeedAd";
import { fetchAds, type ServedAd } from "@/lib/ads";
import { followingIds } from "@/lib/social";
import type { Video } from "@/lib/types";

const SELECT =
  "id, owner_id, title, description, playback_id, status, moderation_status, location, view_count, created_at, profiles(id, username, display_name), video_tags(tags(id, slug, label))";

const AD_EVERY = 4;
const PAGE = 12;

type FeedMode = "foryou" | "following";
type FeedItem = { kind: "video"; key: string; video: Video } | { kind: "ad"; key: string; ad: ServedAd };
type Tag = { id: string; slug: string; label: string };

function interleave(videos: Video[], ads: ServedAd[], offset = 0): FeedItem[] {
  const out: FeedItem[] = [];
  let adIdx = 0;
  videos.forEach((v, i) => {
    out.push({ kind: "video", key: v.id, video: v });
    if (ads.length > 0 && (offset + i + 1) % AD_EVERY === 0) {
      const ad = ads[adIdx % ads.length];
      out.push({ kind: "ad", key: `ad-${offset + i}-${ad.id}`, ad });
      adIdx++;
    }
  });
  return out;
}

export default function Feed() {
  const { colors: c } = useTheme();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<FeedMode>("foryou");
  const [tagSlug, setTagSlug] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const adsRef = useRef<ServedAd[]>([]);

  useEffect(() => {
    supabase
      .from("tags")
      .select("id, slug, label")
      .order("label")
      .limit(40)
      .then(({ data }) => setTags((data as Tag[]) ?? []));
  }, []);

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      let followFilter: string[] | null = null;
      if (mode === "following") {
        if (!session) {
          setItems([]);
          setHasMore(false);
          return;
        }
        followFilter = await followingIds();
        if (followFilter.length === 0) {
          setItems([]);
          setHasMore(false);
          return;
        }
      }

      let query = supabase
        .from("videos")
        .select(
          tagSlug
            ? "id, owner_id, title, description, playback_id, status, moderation_status, location, view_count, created_at, profiles(id, username, display_name), video_tags!inner(tags!inner(id, slug, label))"
            : SELECT
        )
        .eq("status", "ready")
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);

      if (followFilter) query = query.in("owner_id", followFilter);
      if (tagSlug) query = query.eq("video_tags.tags.slug", tagSlug);

      const { data } = await query;
      const videos = (data as Video[]) ?? [];
      setHasMore(videos.length === PAGE);

      if (page === 0 || replace) {
        adsRef.current = await fetchAds("feed").catch(() => [] as ServedAd[]);
      }

      const chunk = interleave(videos, adsRef.current, page * PAGE);
      setItems((prev) => (replace || page === 0 ? chunk : [...prev, ...chunk]));
      if ((replace || page === 0) && chunk.length) setActiveKey(chunk[0].key);
      pageRef.current = page;
    },
    [mode, session, tagSlug]
  );

  const reload = useCallback(async () => {
    pageRef.current = 0;
    await fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => {
    reload();
  }, [mode, tagSlug]);

  const onViewable = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveKey(viewableItems[0].item.key);
  }).current;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(pageRef.current + 1, false);
    setLoadingMore(false);
  }

  const emptyFollowing = mode === "following" && items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <View style={styles.modes}>
          <Pressable onPress={() => setMode("following")}>
            <Text style={[styles.mode, mode === "following" && styles.modeOn]}>Following</Text>
          </Pressable>
          <Text style={styles.modeSep}>|</Text>
          <Pressable onPress={() => setMode("foryou")}>
            <Text style={[styles.mode, mode === "foryou" && styles.modeOn]}>For You</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable style={[styles.chip, !tagSlug && styles.chipOn]} onPress={() => setTagSlug(null)}>
            <Text style={[styles.chipText, !tagSlug && styles.chipTextOn]}>All</Text>
          </Pressable>
          {tags.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.chip, tagSlug === t.slug && styles.chipOn]}
              onPress={() => setTagSlug(tagSlug === t.slug ? null : t.slug)}
            >
              <Text style={[styles.chipText, tagSlug === t.slug && styles.chipTextOn]}>#{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {emptyFollowing ? (
        <View style={[styles.empty, { height: height - 120 }]}>
          <Text style={styles.emptyTitle}>{session ? "No followed creators yet" : "Log in to see Following"}</Text>
          <Text style={[styles.emptyText, { color: c.muted }]}>
            Follow creators from their profile or the + on a video.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.empty, { height: height - 120 }]}>
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptyText}>Be the first to upload Sentry footage.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.key}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          renderItem={({ item }) =>
            item.kind === "video" ? (
              <FeedVideo video={item.video} isActive={item.key === activeKey} height={height} />
            ) : (
              <FeedAd ad={item.ad} isActive={item.key === activeKey} height={height} />
            )
          }
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.8}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
              tintColor="#fff"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, paddingHorizontal: 8 },
  modes: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 8 },
  mode: { color: "rgba(255,255,255,0.55)", fontSize: 16, fontWeight: "600" },
  modeOn: { color: "#fff", fontWeight: "800" },
  modeSep: { color: "rgba(255,255,255,0.35)" },
  chips: { paddingHorizontal: 4, gap: 8, paddingBottom: 8 },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipOn: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#fff" },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: "#0b0b0c" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#888", marginTop: 8, textAlign: "center" },
});
