import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Google Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          soft: "var(--surface-soft)",
          hover: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          soft: "var(--muted-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        action: {
          DEFAULT: "var(--action)",
          hover: "var(--action-hover)",
        },
        cinematic: {
          bg: "var(--cinematic-bg)",
          ink: "var(--cinematic-ink)",
          muted: "var(--cinematic-muted)",
          border: "var(--cinematic-border)",
          gold: "var(--cinematic-gold)",
          "gold-hover": "var(--cinematic-gold-hover)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
