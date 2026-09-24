import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import NotificationsBridge from "@/components/NotificationsBridge";

function ThemedStack() {
  const { colors, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <NotificationsBridge />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="signup" options={{ presentation: "modal" }} />
        <Stack.Screen name="watch/[id]" />
        <Stack.Screen name="u/[username]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="ads-manage" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
