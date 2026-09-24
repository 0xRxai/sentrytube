import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTheme, type Colors } from "@/lib/theme";

export default function Signup() {
  const { colors: c } = useTheme();
  const s = makeStyles(c);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Check your email to confirm, then log in.");
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Create account</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={c.dim} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password (min 6)" placeholderTextColor={c.dim} secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>{busy ? "…" : "Sign up"}</Text>
      </Pressable>
      {msg && <Text style={s.msg}>{msg}</Text>}
      <Pressable onPress={() => router.replace("/login")}>
        <Text style={s.link}>Already have an account? Log in</Text>
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
    msg: { color: "#d97706", marginTop: 12 },
    link: { color: c.brand, marginTop: 20, textAlign: "center" },
  });
