import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string } | null;
};

export default function CommentSheet({
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, body, created_at, author_id, profiles(username)")
        .eq("video_id", videoId)
        .eq("is_removed", false)
        .order("created_at", { ascending: false })
        .limit(100);
      setComments((data as Comment[]) ?? []);
    })();
  }, [visible, videoId]);

  async function send() {
    if (!session) return router.push("/login");
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    const { data } = await supabase
      .from("comments")
      .insert({ video_id: videoId, author_id: session.user.id, body: text })
      .select("id, body, created_at, author_id, profiles(username)")
      .single();
    if (data) {
      setComments((p) => [data as Comment, ...p]);
      setBody("");
    }
    setBusy(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.handle} />
        <View style={styles.head}>
          <Text style={styles.title}>{comments.length} comments</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.author}>
                @{item.profiles?.username ?? "user"} · {timeAgo(item.created_at)}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No comments yet. Say something.</Text>}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={session ? "Add a comment…" : "Log in to comment"}
            placeholderTextColor="#666"
            value={body}
            onChangeText={setBody}
            editable={!!session}
          />
          <Pressable style={styles.send} onPress={send}>
            <Ionicons name="send" size={18} color="#0b0b0c" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 8,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    marginBottom: 10,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { color: "#fff", fontWeight: "700", fontSize: 16 },
  row: { paddingVertical: 10, borderBottomColor: "#2a2a2e", borderBottomWidth: StyleSheet.hairlineWidth },
  author: { color: "#888", fontSize: 12 },
  body: { color: "#fff", marginTop: 3 },
  empty: { color: "#888", textAlign: "center", paddingVertical: 24 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#222",
    borderRadius: 20,
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8e8ea",
    alignItems: "center",
    justifyContent: "center",
  },
});
