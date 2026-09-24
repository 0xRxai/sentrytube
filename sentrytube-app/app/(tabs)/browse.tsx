import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme, type Colors } from "@/lib/theme";
import GridCard from "@/components/GridCard";
import AdCard from "@/components/AdCard";
import type { Video } from "@/lib/types";

const SELECT =
  "id, owner_id, title, playback_id, status, moderation_status, view_count, created_at, profiles(id, username, display_name), video_tags(tags(id, slug, label))";

type Tag = { id: string; slug: string; label: string };

export default function Browse() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const { width } = useWindowDimensions();
  const [videos, setVideos] = useState<Video[]>([]);
  const [q, setQ] = useState("");
  const [tagSlug, setTagSlug] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  const gap = 12;
  const cols = width > 700 ? 4 : 2;
  const cardW = (width - gap * (cols + 1)) / cols;

  useEffect(() => {
    supabase
      .from("tags")
      .select("id, slug, label")
      .order("label")
      .limit(40)
      .then(({ data }) => setTags((data as Tag[]) ?? []));
  }, []);

  const load = useCallback(
    async (search?: string, tag?: string | null) => {
      const activeTag = tag === undefined ? tagSlug : tag;
      let query = supabase
        .from("videos")
        .select(
          activeTag
            ? "id, owner_id, title, playback_id, status, moderation_status, view_count, created_at, profiles(id, username, display_name), video_tags!inner(tags!inner(id, slug, label))"
            : SELECT
        )
        .eq("status", "ready")
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (activeTag) query = query.eq("video_tags.tags.slug", activeTag);
      if (search?.trim()) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`
        );
      }
      const { data } = await query;
      setVideos((data as Video[]) ?? []);
    },
    [tagSlug]
  );

  useEffect(() => {
    load(q, tagSlug);
  }, [tagSlug]);

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <Text style={s.header}>Browse</Text>
      <TextInput
        style={s.search}
        placeholder="Search title, location…"
        placeholderTextColor={c.dim}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => load(q, tagSlug)}
        returnKeyType="search"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Pressable
          style={[s.chip, !tagSlug && s.chipOn]}
          onPress={() => setTagSlug(null)}
        >
          <Text style={[s.chipText, !tagSlug && s.chipTextOn]}>All</Text>
        </Pressable>
        {tags.map((t) => (
          <Pressable
            key={t.id}
            style={[s.chip, tagSlug === t.slug && s.chipOn]}
            onPress={() => setTagSlug(tagSlug === t.slug ? null : t.slug)}
          >
            <Text style={[s.chipText, tagSlug === t.slug && s.chipTextOn]}>#{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        numColumns={cols}
        key={cols}
        columnWrapperStyle={{ gap, paddingHorizontal: gap }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
        ListHeaderComponent={<AdCard placement="feed" />}
        renderItem={({ item }) => <GridCard video={item} width={cardW} />}
        ListEmptyComponent={<Text style={s.empty}>No videos found.</Text>}
      />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { color: c.text, fontSize: 24, fontWeight: "700", paddingHorizontal: 12 },
    search: {
      marginHorizontal: 12,
      marginTop: 10,
      backgroundColor: c.input,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      padding: 12,
    },
    chips: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
    chip: {
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipOn: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.muted, fontSize: 12, fontWeight: "600" },
    chipTextOn: { color: c.onBrand },
    empty: { color: c.muted, textAlign: "center", marginTop: 40 },
  });
