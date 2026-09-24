import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "For You", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: "Browse", tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="upload"
        options={{ title: "Upload", tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 8} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Me", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
