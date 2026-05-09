import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: "var(--lz-bg)",
        panel: "var(--lz-panel)",
        card: "var(--lz-card)",
        sidebar: "var(--lz-bg-soft)",
        hover: "var(--lz-card-hover)",
        accent: "var(--lz-accent)",
        purple: "var(--lz-purple)",
        success: "var(--lz-success)",
        warning: "var(--lz-warning)",
        danger: "var(--lz-danger)",
        text: "var(--lz-text)",
        muted: "var(--lz-muted)",
        subtle: "var(--lz-subtle)",
      },
      boxShadow: {
        soft: "var(--lz-shadow-card)",
        panel: "var(--lz-shadow-panel)",
        glow: "var(--lz-shadow-glow)",
      },
      backgroundImage: {
        halo: "radial-gradient(circle at top, rgba(77, 141, 255, 0.16), transparent 42%)",
        cinematic: "linear-gradient(145deg, #10131A 0%, #0F1115 46%, #090B0F 100%)",
      },
      borderRadius: {
        lz: "var(--lz-radius-md)",
        "lz-lg": "var(--lz-radius-lg)",
        "lz-xl": "var(--lz-radius-xl)",
      },
      transitionTimingFunction: {
        lz: "var(--lz-ease)",
      },
      screens: {
        "3xl": "1920px",
      },
    },
  },
  plugins: [],
} satisfies Config;
