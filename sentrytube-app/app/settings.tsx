import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors, type ThemePref } from "@/lib/theme";

type Category = { id: string; label: string; sort: number; tags: { id: string; label: string }[] };
type Prefs = { notify_new_video: boolean; notify_comments: boolean; notify_likes: boolean };

const PREF_ROWS: { key: keyof Prefs; label: string; help: string }[] = [
  { key: "notify_new_video", label: "New videos in tags I follow", help: "Alert me when a followed tag gets a new video." },
  { key: "notify_comments", label: "Comments on my videos", help: "Alert me when someone comments on my upload." },
  { key: "notify_likes", label: "Likes on my videos", help: "Alert me when someone likes my upload." },
];

const THEME_OPTIONS: { key: ThemePref; label: string; icon: any }[] = [
  { key: "system", label: "Auto", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { colors: c, pref, setPref } = useTheme();
  const s = makeStyles(c);
  const { session, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState<Prefs>({ notify_new_video: true, notify_comments: true, notify_likes: false });

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: cats }, { data: subs }, { data: p }] = await Promise.all([
      supabase.from("tag_categories").select("id, label, sort, tags(id, label)").order("sort"),
      supabase.from("tag_subscriptions").select("tag_id").eq("user_id", session.user.id),
      supabase.from("notification_prefs").select("notify_new_video, notify_comments, notify_likes").eq("user_id", session.user.id).maybeSingle(),
    ]);
    setCategories((cats as Category[]) ?? []);
    setFollowed(new Set((subs ?? []).map((x: any) => x.tag_id)));
    if (p) setPrefs(p as Prefs);
  }, [session]);

  useEffect(() => {
    load();
  }, []);

  async function toggleTag(tagId: string) {
    if (!session) return;
    const following = followed.has(tagId);
    const next = new Set(followed);
    following ? next.delete(tagId) : next.add(tagId);
    setFollowed(next);
    if (following) await supabase.from("tag_subscriptions").delete().eq("tag_id", tagId).eq("user_id", session.user.id);
    else await supabase.from("tag_subscriptions").insert({ tag_id: tagId, user_id: session.user.id });
  }

  async function togglePref(key: keyof Prefs) {
    if (!session) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await supabase.from("notification_prefs").upsert({ user_id: session.user.id, ...next }, { onConflict: "user_id" });
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 8, paddingBottom: 60 }}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.header}>Settings</Text>
      </View>

      <Text style={s.section}>Appearance</Text>
      <View style={s.segment}>
        {THEME_OPTIONS.map((o) => {
          const on = pref === o.key;
          return (
            <Pressable key={o.key} style={[s.segItem, on && s.segItemOn]} onPress={() => setPref(o.key)}>
              <Ionicons name={o.icon} size={18} color={on ? c.onBrand : c.muted} />
              <Text style={[s.segText, on && s.segTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.help}>Auto follows your phone's light or dark setting.</Text>

      {session ? (
        <>
          <Text style={s.section}>Notifications</Text>
          {PREF_ROWS.map((row) => (
            <View key={row.key} style={s.prefRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.prefLabel}>{row.label}</Text>
                <Text style={s.prefHelp}>{row.help}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={() => togglePref(row.key)}
                trackColor={{ true: c.brand, false: c.border }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <Text style={s.section}>Tags you follow</Text>
          <Text style={s.help}>Follow tags to get notified when new videos are posted in them.</Text>
          {categories.map((cat) => (
            <View key={cat.id} style={{ marginTop: 14 }}>
              <Text style={s.catLabel}>{cat.label}</Text>
              <View style={s.chips}>
                {cat.tags.map((t) => {
                  const on = followed.has(t.id);
                  return (
                    <Pressable key={t.id} onPress={() => toggleTag(t.id)} style={[s.chip, on && s.chipOn]}>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{on ? "✓ " : ""}{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable style={s.signout} onPress={async () => { await signOut(); router.back(); }}>
            <Text style={s.signoutText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <Text style={s.help}>Log in to manage notifications and followed tags.</Text>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    header: { color: c.text, fontSize: 22, fontWeight: "700" },
    section: { color: c.text, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 8 },
    help: { color: c.muted, fontSize: 13, marginTop: 6 },
    segment: { flexDirection: "row", backgroundColor: c.input, borderRadius: 10, padding: 4, gap: 4 },
    segItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
    segItemOn: { backgroundColor: c.brand },
    segText: { color: c.muted, fontWeight: "600" },
    segTextOn: { color: c.onBrand },
    prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: c.border, borderBottomWidth: 1 },
    prefLabel: { color: c.text, fontWeight: "600" },
    prefHelp: { color: c.muted, fontSize: 12, marginTop: 2 },
    catLabel: { color: c.muted, fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
    chipOn: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.muted, fontSize: 13 },
    chipTextOn: { color: c.onBrand, fontWeight: "700" },
    signout: { paddingVertical: 18, alignItems: "center", marginTop: 10 },
    signoutText: { color: c.danger, fontWeight: "600" },
  });
