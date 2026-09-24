import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Colors = {
  bg: string;        // screen background
  surface: string;   // cards / rows
  input: string;     // input fields
  border: string;    // hairlines
  text: string;      // primary text
  muted: string;     // secondary text
  dim: string;       // hints / placeholders
  brand: string;     // accent (SentryTube red)
  onBrand: string;   // text on brand
  danger: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
};

const dark: Colors = {
  bg: "#000000", surface: "#111111", input: "#141414", border: "#262626",
  text: "#ffffff", muted: "#8a8a8a", dim: "#666666",
  brand: "#e11d48", onBrand: "#ffffff", danger: "#f87171",
  tabBar: "#000000", tabActive: "#ffffff", tabInactive: "#6f6f6f",
};

const light: Colors = {
  bg: "#ffffff", surface: "#f6f6f7", input: "#f0f0f2", border: "#e4e4e7",
  text: "#0b0b0c", muted: "#5c5c63", dim: "#9a9aa2",
  brand: "#e11d48", onBrand: "#ffffff", danger: "#dc2626",
  tabBar: "#ffffff", tabActive: "#0b0b0c", tabInactive: "#9a9aa2",
};

export type ThemePref = "system" | "light" | "dark";
type Mode = "light" | "dark";

type ThemeState = {
  colors: Colors;
  mode: Mode;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const ThemeContext = createContext<ThemeState>({
  colors: dark, mode: "dark", pref: "system", setPref: () => {},
});

const KEY = "themePref";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setPrefState(v);
    });
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p);
  };

  const mode: Mode = pref === "system" ? ((system ?? "dark") as Mode) : pref;
  const colors = mode === "dark" ? dark : light;

  return (
    <ThemeContext.Provider value={{ colors, mode, pref, setPref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
