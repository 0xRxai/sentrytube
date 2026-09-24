import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { isStaff, isAdmin } from "@/lib/types";
import { formatCount } from "@/lib/format";

type Overview = { total_users: number; total_videos: number; total_views: number; watch_seconds: number; open_reports: number; active_ads: number };
type AdRow = { ad_id: string; title: string; placement: string; impressions: number; clicks: number };

export default function Analytics() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { role } = useAuth();
  const [ov, setOv] = useState<Overview | null>(null);
  const [ads, setAds] = useState<AdRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: a }] = await Promise.all([
        supabase.rpc("admin_platform_overview"),
        supabase.rpc("ad_overview"),
      ]);
      setOv((o?.[0] as Overview) ?? null);
      setAds((a as AdRow[]) ?? []);
    })();
  }, []);

  if (!isStaff(role)) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Staff only.</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>Go back</Text></Pressable>
      </View>
    );
  }

  const cards = [
    { label: "Users", value: formatCount(ov?.total_users ?? 0) },
    { label: "Videos", value: formatCount(ov?.total_videos ?? 0) },
    { label: "Views", value: formatCount(ov?.total_views ?? 0) },
    { label: "Watch (h)", value: ((ov?.watch_seconds ?? 0) / 3600).toFixed(1) },
    { label: "Open reports", value: `${ov?.open_reports ?? 0}` },
    { label: "Active ads", value: `${ov?.active_ads ?? 0}` },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.header}>Analytics</Text>
      </View>

      <View style={s.grid}>
        {cards.map((cd) => (
          <View key={cd.label} style={s.stat}>
            <Text style={s.statValue}>{cd.value}</Text>
            <Text style={s.statLabel}>{cd.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.sectionRow}>
        <Text style={s.section}>Ad performance</Text>
        {isAdmin(role) && (
          <Pressable style={s.manageBtn} onPress={() => router.push("/ads-manage")}>
            <Ionicons name="add" size={16} color={c.onBrand} />
            <Text style={s.manageText}>Manage ads</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={ads}
        keyExtractor={(a) => a.ad_id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
          return (
            <View style={s.adRow}>
              <Text style={s.adTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.adMeta}>{item.placement} · {formatCount(item.impressions)} imp · {item.clicks} clicks · {ctr.toFixed(1)}% CTR</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.muted}>No ad data yet.</Text>}
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
    grid: { flexDirection: "row", flexWrap: "wrap", padding: 10 },
    stat: { width: "33.33%", padding: 8 },
    statValue: { color: c.text, fontSize: 20, fontWeight: "700" },
    statLabel: { color: c.muted, fontSize: 12 },
    section: { color: c.text, fontSize: 16, fontWeight: "700", paddingHorizontal: 14, marginTop: 10, marginBottom: 8 },
    sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 14 },
    manageBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: c.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
    manageText: { color: c.onBrand, fontSize: 12, fontWeight: "700" },
    adRow: { paddingVertical: 10, borderBottomColor: c.border, borderBottomWidth: 1 },
    adTitle: { color: c.text, fontWeight: "600" },
    adMeta: { color: c.muted, fontSize: 12, marginTop: 3 },
    muted: { color: c.muted, textAlign: "center", marginTop: 20 },
    link: { color: c.brand },
  });
