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
        sans: ["'Figtree Variable'", "'Google Sans'", "system-ui", "sans-serif"],
        display: ["'Outfit Variable'", "'Google Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: { DEFAULT: "var(--color-card)", foreground: "var(--color-card-foreground)" },
        popover: { DEFAULT: "var(--color-popover)", foreground: "var(--color-popover-foreground)" },
        sidebar: "var(--color-sidebar)",
        primary: { DEFAULT: "var(--color-primary)", foreground: "var(--color-primary-foreground)", soft: "var(--color-primary-soft)" },
        secondary: { DEFAULT: "var(--color-secondary)", foreground: "var(--color-secondary-foreground)" },
        muted: { DEFAULT: "var(--color-muted)", foreground: "var(--color-muted-foreground)" },
        accent: { DEFAULT: "var(--color-accent)", foreground: "var(--color-accent-foreground)" },
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        ink: { DEFAULT: "var(--color-ink)", foreground: "var(--color-ink-foreground)" },
        success: { DEFAULT: "var(--color-success)", soft: "var(--color-success-soft)", medium: "var(--color-success-medium)" },
        info: { DEFAULT: "var(--color-info)", soft: "var(--color-info-soft)" },
        destructive: { DEFAULT: "var(--color-destructive)", foreground: "var(--color-destructive-foreground)", soft: "var(--color-destructive-soft)", tint: "var(--color-destructive-tint)", border: "var(--color-destructive-border)" },
        cinematic: { bg: "var(--cinematic-bg)", ink: "var(--cinematic-ink)", muted: "var(--cinematic-muted)", border: "var(--cinematic-border)", gold: "var(--cinematic-gold)" },
      },
      borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)" },
      boxShadow: { soft: "var(--shadow-soft)", lift: "var(--shadow-lift)", control: "var(--shadow-control)", inset: "var(--shadow-inset)", header: "var(--shadow-header)", shell: "var(--shadow-shell)" },
      fontSize: {
        hero: ["60px", "63px"], h1: ["40px", "48px"], h2: ["32px", "40px"], h3: ["24px", "32px"],
        "card-title": ["19px", "26px"], panel: ["18px", "28px"], stat: ["30px", "36px"],
        "body-lg": ["16px", "24px"], body: ["14px", "20px"], "body-sm": ["12px", "16px"],
        pill: ["11px", "16px"],
      },
    },
  },
  plugins: [],
};
export default config;
