import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Ask permission, get the Expo push token, and store it for the current user.
// Safe to call repeatedly (idempotent upsert). No-ops on simulators / web.
export async function registerForPush(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

  await supabase
    .from("device_tokens")
    .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "user_id,token" });
}

export async function unregisterPush(userId: string, token?: string) {
  if (!token) return;
  await supabase.from("device_tokens").delete().eq("user_id", userId).eq("token", token);
}
