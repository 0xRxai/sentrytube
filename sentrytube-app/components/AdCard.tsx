import { useEffect, useRef, useState } from "react";
import { Text, Image, Pressable, StyleSheet, Linking } from "react-native";
import { fetchAd, logAdEvent, type ServedAd } from "@/lib/ads";
import { useTheme, type Colors } from "@/lib/theme";

// A house-ad slot. Logs an impression when shown and a click when tapped.
export default function AdCard({ placement = "feed", tag }: { placement?: "feed" | "sidebar" | "preroll"; tag?: string }) {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const [ad, setAd] = useState<ServedAd | null>(null);
  const logged = useRef(false);

  useEffect(() => {
    fetchAd(placement, tag).then(setAd).catch(() => setAd(null));
  }, [placement, tag]);

  useEffect(() => {
    if (ad && !logged.current) {
      logged.current = true;
      logAdEvent("ad_impression", ad.id);
    }
  }, [ad]);

  if (!ad) return null;

  return (
    <Pressable
      style={s.card}
      onPress={() => {
        logAdEvent("ad_click", ad.id);
        Linking.openURL(ad.target_url);
      }}
    >
      <Text style={s.sponsored}>SPONSORED</Text>
      {ad.image_url ? <Image source={{ uri: ad.image_url }} style={s.image} resizeMode="cover" /> : null}
      <Text style={s.title}>{ad.title}</Text>
      {ad.body ? <Text style={s.body}>{ad.body}</Text> : null}
    </Pressable>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 10, overflow: "hidden", marginHorizontal: 12, marginBottom: 14 },
    sponsored: { color: c.dim, fontSize: 10, fontWeight: "700", padding: 8 },
    image: { width: "100%", aspectRatio: 16 / 9 },
    title: { color: c.text, fontWeight: "700", paddingHorizontal: 12, paddingTop: 8 },
    body: { color: c.muted, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 },
  });
