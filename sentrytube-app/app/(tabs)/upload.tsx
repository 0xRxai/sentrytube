import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTheme, type Colors } from "@/lib/theme";
import { apiFetch } from "@/lib/api";

type Category = { id: string; label: string; tags: { id: string; label: string }[] };

export default function Upload() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { session } = useAuth();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("tag_categories")
      .select("id, label, tags(id, label)")
      .order("sort")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  if (!session) {
    return (
      <View style={s.prompt}>
        <Text style={s.promptText}>Log in to upload your Sentry footage.</Text>
        <Pressable style={s.btn} onPress={() => router.push("/login")}>
          <Text style={s.btnText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!res.canceled) setAsset(res.assets[0]);
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function publish() {
    if (!asset) return setStatus("Pick a video first.");
    if (!title.trim()) return setStatus("Add a title.");
    setBusy(true);
    try {
      setStatus("Preparing upload…");
      const data = await apiFetch("/api/upload/create", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          location,
          tagIds: [...selectedTags],
        }),
      });

      setStatus("Uploading…");
      const file = await fetch(asset.uri);
      const blob = await file.blob();
      const put = await fetch(data.uploadUrl, { method: "PUT", body: blob });
      if (!put.ok) throw new Error("Upload failed");

      setStatus("Processing — your video will appear shortly.");
      setBusy(false);
      setTimeout(() => router.replace("/profile"), 1500);
    } catch (e: any) {
      setStatus(e.message ?? "Upload failed");
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 40 }}>
      <Text style={s.header}>Upload</Text>
      <Pressable style={s.picker} onPress={pick}>
        <Text style={s.pickerText}>{asset ? "Video selected" : "Choose a video"}</Text>
      </Pressable>
      <TextInput style={s.input} placeholder="Title" placeholderTextColor={c.dim} value={title} onChangeText={setTitle} />
      <TextInput
        style={[s.input, { minHeight: 72, textAlignVertical: "top" }]}
        placeholder="Description (optional)"
        placeholderTextColor={c.dim}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput style={s.input} placeholder="Location (optional)" placeholderTextColor={c.dim} value={location} onChangeText={setLocation} />

      <Text style={s.section}>Tags</Text>
      {categories.map((cat) => (
        <View key={cat.id} style={{ marginBottom: 12 }}>
          <Text style={s.cat}>{cat.label}</Text>
          <View style={s.chips}>
            {cat.tags.map((t) => {
              const on = selectedTags.has(t.id);
              return (
                <Pressable key={t.id} onPress={() => toggleTag(t.id)} style={[s.chip, on && s.chipOn]}>
                  <Text style={[s.chipText, on && s.chipTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable style={s.btn} onPress={publish} disabled={busy}>
        <Text style={s.btnText}>{busy ? status ?? "…" : "Publish"}</Text>
      </Pressable>
      {status && !busy ? <Text style={s.status}>{status}</Text> : null}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { color: c.text, fontSize: 24, fontWeight: "700", marginBottom: 14 },
    picker: {
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: "dashed",
      borderRadius: 12,
      padding: 28,
      alignItems: "center",
      marginBottom: 12,
    },
    pickerText: { color: c.muted, fontWeight: "600" },
    input: {
      backgroundColor: c.input,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      padding: 12,
      marginBottom: 10,
    },
    section: { color: c.text, fontWeight: "700", marginTop: 8, marginBottom: 8 },
    cat: { color: c.muted, fontSize: 12, textTransform: "uppercase", marginBottom: 6 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
    chipOn: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.muted, fontSize: 13 },
    chipTextOn: { color: c.onBrand, fontWeight: "700" },
    btn: { backgroundColor: c.brand, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
    btnText: { color: c.onBrand, fontWeight: "700", fontSize: 16 },
    status: { color: c.muted, marginTop: 12, textAlign: "center" },
    prompt: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
    promptText: { color: c.muted, textAlign: "center" },
  });
