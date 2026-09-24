import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#e11d48",
          dark: "#be123c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
