import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { hlsUrl } from "@/lib/mux";
import { timeAgo } from "@/lib/format";
import HlsVideo from "@/components/HlsVideo";
import type { Video as VideoType } from "@/lib/types";

type Comment = { id: string; body: string; created_at: string; author_id: string; profiles: { username: string } | null };

export default function Watch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session } = useAuth();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data: v } = await supabase
        .from("videos")
        .select("id, title, description, playback_id, view_count, created_at, profiles(id, username, display_name)")
        .eq("id", id)
        .single();
      setVideo(v as VideoType);
      const { data: cm } = await supabase
        .from("comments")
        .select("id, body, created_at, author_id, profiles(username)")
        .eq("video_id", id)
        .order("created_at", { ascending: false });
      setComments((cm as Comment[]) ?? []);
    })();
  }, [id]);

  async function addComment() {
    if (!session) return router.push("/login");
    const text = body.trim();
    if (!text) return;
    const { data } = await supabase
      .from("comments")
      .insert({ video_id: id, author_id: session.user.id, body: text })
      .select("id, body, created_at, author_id, profiles(username)")
      .single();
    if (data) {
      setComments((p) => [data as Comment, ...p]);
      setBody("");
    }
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={s.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </Pressable>

      {video?.playback_id ? (
        <View style={s.player}>
          <HlsVideo uri={hlsUrl(video.playback_id)} controls contentFit="contain" />
        </View>
      ) : (
        <View style={[s.player, s.center]}>
          <Text style={s.muted}>Processing…</Text>
        </View>
      )}

      <FlatList
        data={comments}
        keyExtractor={(cm) => cm.id}
        ListHeaderComponent={
          <View style={s.metaBox}>
            <Text style={s.title}>{video?.title}</Text>
            <Text style={s.author}>@{video?.profiles?.username}</Text>
            {video?.description ? <Text style={s.desc}>{video.description}</Text> : null}
            <Text style={s.cheader}>{comments.length} comments</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.comment}>
            <Text style={s.cauthor}>@{item.profiles?.username ?? "user"} · {timeAgo(item.created_at)}</Text>
            <Text style={s.cbody}>{item.body}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
      />

      <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.input}
          placeholder={session ? "Add a comment…" : "Log in to comment"}
          placeholderTextColor={c.dim}
          value={body}
          onChangeText={setBody}
        />
        <Pressable style={s.send} onPress={addComment}>
          <Ionicons name="send" size={20} color={c.onBrand} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    back: { position: "absolute", top: 44, left: 10, zIndex: 10, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20, padding: 2 },
    player: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000", position: "relative", overflow: "hidden" },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: c.muted },
    metaBox: { marginBottom: 10 },
    title: { color: c.text, fontSize: 18, fontWeight: "700" },
    author: { color: c.muted, marginTop: 4 },
    desc: { color: c.text, marginTop: 8 },
    cheader: { color: c.text, fontWeight: "700", marginTop: 16 },
    comment: { paddingVertical: 8, borderBottomColor: c.border, borderBottomWidth: 1 },
    cauthor: { color: c.muted, fontSize: 12 },
    cbody: { color: c.text, marginTop: 3 },
    inputRow: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: c.surface, borderTopColor: c.border, borderTopWidth: 1 },
    input: { flex: 1, backgroundColor: c.input, borderRadius: 20, color: c.text, paddingHorizontal: 14, paddingVertical: 8 },
    send: { backgroundColor: c.brand, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  });
