import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { thumbnailUrl } from "@/lib/mux";
import { formatCount } from "@/lib/format";
import { useTheme, type Colors } from "@/lib/theme";
import type { Video } from "@/lib/types";

export default function GridCard({ video, width }: { video: Video; width: number }) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const thumb = video.playback_id ? thumbnailUrl(video.playback_id) : null;
  return (
    <Pressable style={[s.card, { width }]} onPress={() => router.push(`/watch/${video.id}`)}>
      <View style={[s.thumb, { width, height: width * 1.4 }]}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.center]}>
            <Text style={s.muted}>Processing</Text>
          </View>
        )}
        <View style={s.views}>
          <Ionicons name="play" size={12} color="#fff" />
          <Text style={s.viewText}>{formatCount(video.view_count)}</Text>
        </View>
      </View>
      <Text style={s.title} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={s.author}>@{video.profiles?.username ?? "unknown"}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { marginBottom: 14 },
    thumb: { borderRadius: 8, overflow: "hidden", backgroundColor: c.input },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: c.dim, fontSize: 12 },
    views: { position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 3 },
    viewText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    title: { color: c.text, fontSize: 13, marginTop: 5 },
    author: { color: c.muted, fontSize: 12, marginTop: 2 },
  });
