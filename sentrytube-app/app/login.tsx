import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTheme, type Colors } from "@/lib/theme";

export default function Login() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.back();
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Log in</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={c.dim} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor={c.dim} secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>{busy ? "…" : "Log in"}</Text>
      </Pressable>
      {msg && <Text style={s.err}>{msg}</Text>}
      <Pressable onPress={() => router.replace("/signup")}>
        <Text style={s.link}>No account? Sign up</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: "center" },
    title: { color: c.text, fontSize: 28, fontWeight: "700", marginBottom: 24 },
    input: { backgroundColor: c.input, borderColor: c.border, borderWidth: 1, borderRadius: 10, color: c.text, padding: 14, marginBottom: 12 },
    btn: { backgroundColor: c.brand, borderRadius: 10, padding: 15, alignItems: "center" },
    btnText: { color: c.onBrand, fontWeight: "700", fontSize: 16 },
    err: { color: c.danger, marginTop: 12 },
    link: { color: c.brand, marginTop: 20, textAlign: "center" },
  });
