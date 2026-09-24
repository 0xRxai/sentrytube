import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, StyleSheet, Linking } from "react-native";
import { logAdEvent, type ServedAd } from "@/lib/ads";

// A full-screen sponsored "page" in the vertical feed. Logs an impression the
// first time it becomes the active page, and a click when the CTA is tapped.
export default function FeedAd({
  ad,
  isActive,
  height,
}: {
  ad: ServedAd;
  isActive: boolean;
  height: number;
}) {
  const logged = useRef(false);

  useEffect(() => {
    if (isActive && !logged.current) {
      logged.current = true;
      logAdEvent("ad_impression", ad.id);
    }
  }, [isActive]);

  return (
    <View style={[styles.page, { height }]}>
      {ad.image_url ? (
        <Image source={{ uri: ad.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      <View style={styles.scrim} />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>SPONSORED</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{ad.title}</Text>
        {ad.body ? <Text style={styles.body}>{ad.body}</Text> : null}
        <Pressable
          style={styles.cta}
          onPress={() => {
            logAdEvent("ad_click", ad.id);
            Linking.openURL(ad.target_url);
          }}
        >
          <Text style={styles.ctaText}>Learn more</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", backgroundColor: "#000", justifyContent: "flex-end" },
  fallback: { backgroundColor: "#1a1a1a" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  badge: { position: "absolute", top: 60, left: 14, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: "#ddd", fontSize: 10, fontWeight: "700" },
  content: { position: "absolute", left: 16, right: 16, bottom: 60 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 8 },
  body: { color: "#eee", fontSize: 15, marginBottom: 16 },
  cta: { backgroundColor: "#e11d48", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
