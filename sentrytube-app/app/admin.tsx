import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { isStaff } from "@/lib/types";
import { timeAgo } from "@/lib/format";

type Report = {
  id: string;
  target_type: "video" | "comment";
  video_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
  videos: { title: string } | null;
  comments: { body: string; video_id: string } | null;
};

export default function Admin() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session, role } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("id, target_type, video_id, comment_id, reason, details, created_at, videos(title), comments(body, video_id)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, []);

  if (!session || !isStaff(role)) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Staff only.</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>Go back</Text></Pressable>
      </View>
    );
  }

  async function act(r: Report, action: "remove" | "dismiss") {
    setBusy(r.id);
    if (action === "remove") {
      if (r.target_type === "video" && r.video_id) await supabase.from("videos").update({ moderation_status: "removed" }).eq("id", r.video_id);
      else if (r.target_type === "comment" && r.comment_id) await supabase.from("comments").update({ is_removed: true }).eq("id", r.comment_id);
    }
    const patch = { status: action === "remove" ? "actioned" : "dismissed", resolved_by: session!.user.id, resolved_at: new Date().toISOString() };
    let q = supabase.from("reports").update(patch).eq("status", "open");
    q = r.target_type === "video" ? q.eq("video_id", r.video_id) : q.eq("comment_id", r.comment_id);
    await q;
    setBusy(null);
    setReports((prev) => prev.filter((x) => x.id !== r.id));
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.header}>Moderation</Text>
        <Pressable style={s.analyticsBtn} onPress={() => router.push("/analytics")}>
          <Ionicons name="bar-chart" size={16} color={c.text} />
          <Text style={s.analyticsText}>Analytics</Text>
        </Pressable>
      </View>
      <Text style={s.sub}>{reports.length} open report{reports.length === 1 ? "" : "s"}</Text>

      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.reason}>{item.reason.toUpperCase()} · {item.target_type}</Text>
            <Text style={s.target} numberOfLines={2}>
              {item.target_type === "video" ? item.videos?.title ?? "(deleted)" : `"${item.comments?.body ?? "(deleted)"}"`}
            </Text>
            {item.details ? <Text style={s.details}>“{item.details}”</Text> : null}
            <Text style={s.time}>{timeAgo(item.created_at)}</Text>
            <View style={s.actions}>
              <Pressable style={[s.act, s.remove]} disabled={busy === item.id} onPress={() => act(item, "remove")}>
                <Text style={s.actText}>Remove</Text>
              </Pressable>
              <Pressable style={[s.act, s.dismiss]} disabled={busy === item.id} onPress={() => act(item, "dismiss")}>
                <Text style={s.actTextDim}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>Queue is clear. 🎉</Text>}
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
    analyticsBtn: { marginLeft: "auto", marginRight: 12, flexDirection: "row", alignItems: "center", gap: 4, borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    analyticsText: { color: c.text, fontSize: 12, fontWeight: "600" },
    sub: { color: c.muted, paddingHorizontal: 14, marginTop: 2 },
    card: { backgroundColor: c.surface, borderRadius: 10, padding: 14, marginBottom: 12, borderColor: c.border, borderWidth: 1 },
    reason: { color: c.danger, fontSize: 12, fontWeight: "700" },
    target: { color: c.text, marginTop: 6 },
    details: { color: c.muted, marginTop: 4, fontStyle: "italic" },
    time: { color: c.dim, fontSize: 12, marginTop: 6 },
    actions: { flexDirection: "row", gap: 10, marginTop: 12 },
    act: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
    remove: { backgroundColor: c.brand },
    dismiss: { borderColor: c.border, borderWidth: 1 },
    actText: { color: c.onBrand, fontWeight: "700" },
    actTextDim: { color: c.text, fontWeight: "600" },
    muted: { color: c.muted, textAlign: "center", marginTop: 20 },
    link: { color: c.brand },
  });
