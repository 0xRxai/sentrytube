import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const REASONS: { key: string; label: string }[] = [
  { key: "spam", label: "Spam" },
  { key: "harassment", label: "Harassment" },
  { key: "illegal", label: "Illegal content" },
  { key: "privacy", label: "Privacy violation" },
  { key: "other", label: "Other" },
];

export default function ReportSheet({
  videoId,
  visible,
  onClose,
}: {
  videoId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session) return router.push("/login");
    if (!reason) return setStatus("Pick a reason.");
    setBusy(true);
    setStatus(null);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "video",
          videoId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setStatus("Thanks — report submitted.");
      setTimeout(onClose, 900);
    } catch (e: any) {
      setStatus(e.message ?? "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.head}>
          <Text style={styles.title}>Report video</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        {REASONS.map((r) => (
          <Pressable
            key={r.key}
            style={[styles.reason, reason === r.key && styles.reasonOn]}
            onPress={() => setReason(r.key)}
          >
            <Text style={styles.reasonText}>{r.label}</Text>
          </Pressable>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Optional details"
          placeholderTextColor="#666"
          value={details}
          onChangeText={setDetails}
          multiline
        />
        <Pressable style={styles.btn} onPress={submit} disabled={busy}>
          <Text style={styles.btnText}>{busy ? "Sending…" : "Submit report"}</Text>
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { color: "#fff", fontWeight: "700", fontSize: 17 },
  reason: {
    paddingVertical: 12,
    borderBottomColor: "#2a2a2e",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reasonOn: { backgroundColor: "#2a2a30" },
  reasonText: { color: "#fff", fontSize: 15 },
  input: {
    marginTop: 12,
    backgroundColor: "#222",
    borderRadius: 10,
    color: "#fff",
    padding: 12,
    minHeight: 64,
    textAlignVertical: "top",
  },
  btn: {
    marginTop: 14,
    backgroundColor: "#e8e8ea",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#0b0b0c", fontWeight: "700" },
  status: { color: "#aaa", textAlign: "center", marginTop: 10 },
});
