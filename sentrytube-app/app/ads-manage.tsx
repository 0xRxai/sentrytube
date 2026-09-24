import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { isAdmin } from "@/lib/types";

type Campaign = { id: string; name: string; advertiser: string | null; status: string };
type Ad = { id: string; campaign_id: string; title: string; placement: string; weight: number; active: boolean };
type Placement = "feed" | "sidebar" | "preroll";

export default function AdsManage() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session, role } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [busy, setBusy] = useState(false);

  const [cName, setCName] = useState("");
  const [cAdv, setCAdv] = useState("");
  const [aCampaign, setACampaign] = useState("");
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");
  const [aImg, setAImg] = useState("");
  const [aUrl, setAUrl] = useState("");
  const [aPlacement, setAPlacement] = useState<Placement>("feed");

  const load = useCallback(async () => {
    const [{ data: cs }, { data: a }] = await Promise.all([
      supabase.from("ad_campaigns").select("id, name, advertiser, status").order("created_at", { ascending: false }),
      supabase.from("ads").select("id, campaign_id, title, placement, weight, active").order("created_at", { ascending: false }),
    ]);
    setCampaigns((cs as Campaign[]) ?? []);
    setAds((a as Ad[]) ?? []);
    if (!aCampaign && cs && cs.length) setACampaign((cs[0] as Campaign).id);
  }, [aCampaign]);

  useEffect(() => {
    load();
  }, []);

  if (!session || !isAdmin(role)) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Admins only.</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>Go back</Text></Pressable>
      </View>
    );
  }

  async function createCampaign() {
    if (!cName.trim()) return;
    setBusy(true);
    await supabase.from("ad_campaigns").insert({ name: cName.trim(), advertiser: cAdv.trim() || null, created_by: session!.user.id });
    setBusy(false);
    setCName("");
    setCAdv("");
    load();
  }

  async function createAd() {
    if (!aCampaign || !aTitle.trim() || !aUrl.trim()) return;
    setBusy(true);
    await supabase.from("ads").insert({
      campaign_id: aCampaign,
      title: aTitle.trim(),
      body: aBody.trim() || null,
      image_url: aImg.trim() || null,
      target_url: aUrl.trim(),
      placement: aPlacement,
    });
    setBusy(false);
    setATitle("");
    setABody("");
    setAImg("");
    setAUrl("");
    load();
  }

  async function toggleAd(ad: Ad) {
    await supabase.from("ads").update({ active: !ad.active }).eq("id", ad.id);
    setAds((p) => p.map((x) => (x.id === ad.id ? { ...x, active: !x.active } : x)));
  }

  async function cycleCampaign(cp: Campaign) {
    const next = cp.status === "active" ? "paused" : "active";
    await supabase.from("ad_campaigns").update({ status: next }).eq("id", cp.id);
    setCampaigns((p) => p.map((x) => (x.id === cp.id ? { ...x, status: next } : x)));
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 8, paddingBottom: 60 }}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.header}>Ads</Text>
      </View>

      <Text style={s.section}>New campaign</Text>
      <TextInput style={s.input} placeholder="Campaign name" placeholderTextColor={c.dim} value={cName} onChangeText={setCName} />
      <TextInput style={s.input} placeholder="Advertiser (optional)" placeholderTextColor={c.dim} value={cAdv} onChangeText={setCAdv} />
      <Pressable style={s.btn} onPress={createCampaign} disabled={busy}><Text style={s.btnText}>Create campaign</Text></Pressable>

      <Text style={s.section}>New ad</Text>
      <View style={s.chips}>
        {campaigns.map((cp) => (
          <Pressable key={cp.id} onPress={() => setACampaign(cp.id)} style={[s.chip, aCampaign === cp.id && s.chipOn]}>
            <Text style={[s.chipText, aCampaign === cp.id && s.chipTextOn]}>{cp.name}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={s.input} placeholder="Title" placeholderTextColor={c.dim} value={aTitle} onChangeText={setATitle} />
      <TextInput style={s.input} placeholder="Body (optional)" placeholderTextColor={c.dim} value={aBody} onChangeText={setABody} />
      <TextInput style={s.input} placeholder="Image URL (optional)" placeholderTextColor={c.dim} value={aImg} onChangeText={setAImg} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Target URL (https://…)" placeholderTextColor={c.dim} value={aUrl} onChangeText={setAUrl} autoCapitalize="none" />
      <View style={s.chips}>
        {(["feed", "sidebar", "preroll"] as Placement[]).map((p) => (
          <Pressable key={p} onPress={() => setAPlacement(p)} style={[s.chip, aPlacement === p && s.chipOn]}>
            <Text style={[s.chipText, aPlacement === p && s.chipTextOn]}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={s.btn} onPress={createAd} disabled={busy}><Text style={s.btnText}>Create ad</Text></Pressable>

      <Text style={s.section}>Campaigns</Text>
      {campaigns.map((cp) => (
        <View key={cp.id} style={s.row}>
          <Text style={s.rowTitle}>{cp.name}</Text>
          <Pressable onPress={() => cycleCampaign(cp)} style={[s.status, cp.status === "active" ? s.on : s.off]}>
            <Text style={s.statusText}>{cp.status}</Text>
          </Pressable>
        </View>
      ))}

      <Text style={s.section}>Ads</Text>
      {ads.map((a) => (
        <View key={a.id} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>{a.title}</Text>
            <Text style={s.rowMeta}>{a.placement} · weight {a.weight}</Text>
          </View>
          <Pressable onPress={() => toggleAd(a)} style={[s.status, a.active ? s.on : s.off]}>
            <Text style={s.statusText}>{a.active ? "active" : "paused"}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 12 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    header: { color: c.text, fontSize: 22, fontWeight: "700" },
    section: { color: c.text, fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 8 },
    input: { backgroundColor: c.input, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, padding: 12, marginBottom: 8 },
    btn: { backgroundColor: c.brand, borderRadius: 10, padding: 13, alignItems: "center", marginTop: 4 },
    btnText: { color: c.onBrand, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    chip: { borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    chipOn: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.muted, fontSize: 13 },
    chipTextOn: { color: c.onBrand, fontWeight: "700" },
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomColor: c.border, borderBottomWidth: 1 },
    rowTitle: { color: c.text, fontWeight: "600", flex: 1 },
    rowMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
    status: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    on: { backgroundColor: "rgba(34,197,94,0.2)" },
    off: { backgroundColor: c.input },
    statusText: { color: c.text, fontSize: 12, fontWeight: "600" },
    muted: { color: c.muted },
    link: { color: c.brand },
  });
