import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, useWindowDimensions } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { formatCount } from "@/lib/format";
import { isFollowing, toggleFollow } from "@/lib/social";
import GridCard from "@/components/GridCard";
import type { Profile, Video } from "@/lib/types";

const SELECT =
  "id, owner_id, title, playback_id, status, moderation_status, view_count, created_at, profiles(id, username, display_name), video_tags(tags(id, slug, label))";

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session } = useAuth();
  const gap = 12;
  const cardW = (width - gap * 3) / 2;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [following, setFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, role")
      .eq("username", username)
      .maybeSingle();
    if (!p) {
      setProfile(null);
      return;
    }
    setProfile(p as Profile);
    const [{ data: vids }, { data: fc }] = await Promise.all([
      supabase
        .from("videos")
        .select(SELECT)
        .eq("owner_id", p.id)
        .eq("status", "ready")
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false }),
      supabase.rpc("profile_follow_counts", { p_user_id: p.id }),
    ]);
    setVideos((vids as Video[]) ?? []);
    const row = Array.isArray(fc) ? fc[0] : fc;
    if (row) setCounts({ followers: Number(row.followers ?? 0), following: Number(row.following ?? 0) });
    if (session) setFollowing(await isFollowing(p.id));
  }, [username, session]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFollow() {
    if (!session) return router.push("/login");
    if (!profile || profile.id === session.user.id) return;
    const next = await toggleFollow(profile.id, following);
    setFollowing(next);
    setCounts((c) => ({ ...c, followers: c.followers + (next ? 1 : -1) }));
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.headRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={s.header}>@{username}</Text>
      </View>

      {!profile ? (
        <Text style={s.empty}>User not found.</Text>
      ) : (
        <>
          <View style={s.card}>
            <Text style={s.name}>{profile.display_name ?? profile.username}</Text>
            {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
            <Text style={s.meta}>
              {formatCount(counts.followers)} followers · {formatCount(counts.following)} following ·{" "}
              {videos.length} videos
            </Text>
            {session && profile.id !== session.user.id ? (
              <Pressable style={[s.followBtn, following && s.followBtnOn]} onPress={onFollow}>
                <Text style={[s.followText, following && s.followTextOn]}>
                  {following ? "Following" : "Follow"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={videos}
            keyExtractor={(v) => v.id}
            numColumns={2}
            columnWrapperStyle={{ gap, paddingHorizontal: gap }}
            contentContainerStyle={{ paddingBottom: 40, gap }}
            renderItem={({ item }) => <GridCard video={item} width={cardW} />}
            ListEmptyComponent={<Text style={s.empty}>No public videos.</Text>}
          />
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginBottom: 8 },
    header: { color: c.text, fontSize: 18, fontWeight: "700" },
    card: { paddingHorizontal: 16, marginBottom: 16 },
    name: { color: c.text, fontSize: 22, fontWeight: "700" },
    bio: { color: c.muted, marginTop: 6 },
    meta: { color: c.muted, marginTop: 8, fontSize: 13 },
    followBtn: {
      marginTop: 12,
      backgroundColor: c.brand,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    followBtnOn: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border },
    followText: { color: c.onBrand, fontWeight: "700" },
    followTextOn: { color: c.text },
    empty: { color: c.muted, textAlign: "center", marginTop: 40 },
  });
