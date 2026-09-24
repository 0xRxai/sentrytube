import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { formatCount } from "@/lib/format";
import { isStaff } from "@/lib/types";

type Overview = { videos: number; views: number; watch_seconds: number; likes: number; comments: number };
type VideoStat = { video_id: string; title: string; status: string; views: number; likes: number; comments: number };

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session, profile, role, signOut } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [videos, setVideos] = useState<VideoStat[]>([]);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: o }, { data: b }] = await Promise.all([
      supabase.rpc("creator_overview"),
      supabase.rpc("creator_video_breakdown"),
    ]);
    setOverview((o?.[0] as Overview) ?? null);
    setVideos((b as VideoStat[]) ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!session) {
    return (
      <View style={s.prompt}>
        <Text style={s.promptText}>Log in to see your profile, uploads, and stats.</Text>
        <Pressable style={s.btn} onPress={() => router.push("/login")}>
          <Text style={s.btnText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.head}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(profile?.display_name ?? profile?.username ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{profile?.display_name ?? profile?.username}</Text>
          <Text style={s.username}>@{profile?.username}</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.push("/notifications")}>
          <Ionicons name="notifications-outline" size={22} color={c.text} />
        </Pressable>
        <Pressable style={s.iconBtn} onPress={() => router.push("/settings")}>
          <Ionicons name="settings-outline" size={22} color={c.text} />
        </Pressable>
        {isStaff(role) && (
          <Pressable style={s.adminBtn} onPress={() => router.push("/admin")}>
            <Ionicons name="shield-checkmark" size={16} color="#fbbf24" />
            <Text style={s.adminText}>{role === "admin" ? "Admin" : "Mod"}</Text>
          </Pressable>
        )}
      </View>

      <View style={s.stats}>
        <Stat c={c} label="Videos" value={overview?.videos ?? 0} />
        <Stat c={c} label="Views" value={formatCount(overview?.views ?? 0)} />
        <Stat c={c} label="Likes" value={formatCount(overview?.likes ?? 0)} />
        <Stat c={c} label="Comments" value={formatCount(overview?.comments ?? 0)} />
      </View>

      <FlatList
        data={videos}
        keyExtractor={(v) => v.video_id}
        ListHeaderComponent={<Text style={s.section}>Your uploads</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => router.push(`/watch/${item.video_id}`)}>
            <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.rowMeta}>
              {item.status === "ready" ? "Live" : "Processing"} · {formatCount(item.views)} views · {item.likes} likes
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={s.empty}>No uploads yet.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <Pressable style={s.signout} onPress={async () => { await signOut(); }}>
        <Text style={s.signoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function Stat({ c, label, value }: { c: Colors; label: string; value: string | number }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
    head: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.input, alignItems: "center", justifyContent: "center" },
    avatarText: { color: c.text, fontSize: 22, fontWeight: "700" },
    name: { color: c.text, fontSize: 18, fontWeight: "700" },
    username: { color: c.muted },
    iconBtn: { padding: 6 },
    adminBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderColor: "#a97e12", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    adminText: { color: "#c98f14", fontWeight: "700", fontSize: 12 },
    stats: { flexDirection: "row", justifyContent: "space-between", marginVertical: 20 },
    section: { color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 10 },
    row: { paddingVertical: 10, borderBottomColor: c.border, borderBottomWidth: 1 },
    rowTitle: { color: c.text, fontWeight: "600" },
    rowMeta: { color: c.muted, fontSize: 12, marginTop: 3 },
    empty: { color: c.muted },
    signout: { paddingVertical: 14, alignItems: "center" },
    signoutText: { color: c.danger, fontWeight: "600" },
    prompt: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
    promptText: { color: c.muted, textAlign: "center" },
    btn: { backgroundColor: c.brand, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" },
    btnText: { color: c.onBrand, fontWeight: "700", fontSize: 16 },
  });
