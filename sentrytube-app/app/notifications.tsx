import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { timeAgo } from "@/lib/format";

type Notif = {
  id: string;
  type: "new_video" | "comment" | "like";
  is_read: boolean;
  created_at: string;
  video_id: string | null;
  actor: { username: string | null; display_name: string | null } | null;
  videos: { id: string; title: string } | null;
  tags: { label: string } | null;
};

function describe(n: Notif): string {
  const who = n.actor?.display_name ?? n.actor?.username ?? "Someone";
  if (n.type === "new_video") return `${who} posted in #${n.tags?.label ?? "a tag you follow"}`;
  if (n.type === "comment") return `${who} commented on your video`;
  return `${who} liked your video`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, is_read, created_at, video_id, actor:profiles!notifications_actor_id_fkey(username, display_name), videos(id, title), tags(label)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const list = (data as Notif[]) ?? [];
      setItems(list);
      const unread = list.filter((n) => !n.is_read).map((n) => n.id);
      if (unread.length) await supabase.from("notifications").update({ is_read: true }).in("id", unread);
    })();
  }, [session]);

  if (!session) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Log in to see notifications.</Text>
        <Pressable onPress={() => router.push("/login")}><Text style={s.link}>Log in</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.header}>Notifications</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <Pressable style={[s.row, !item.is_read && s.unread]} onPress={() => item.videos && router.push(`/watch/${item.videos.id}`)}>
            <Text style={s.text}>{describe(item)}</Text>
            {item.videos?.title ? <Text style={s.vtitle}>“{item.videos.title}”</Text> : null}
            <Text style={s.time}>{timeAgo(item.created_at)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={s.muted}>No notifications yet. Follow tags to get alerts.</Text>}
      />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 12 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
    header: { color: c.text, fontSize: 22, fontWeight: "700" },
    row: { paddingVertical: 12, borderBottomColor: c.border, borderBottomWidth: 1, paddingHorizontal: 8, borderRadius: 8 },
    unread: { backgroundColor: c.surface },
    text: { color: c.text },
    vtitle: { color: c.muted, marginTop: 2 },
    time: { color: c.dim, fontSize: 12, marginTop: 3 },
    muted: { color: c.muted, textAlign: "center", marginTop: 20 },
    link: { color: c.brand },
  });
