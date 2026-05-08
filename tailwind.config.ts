import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1115",
        panel: "#171A21",
        card: "#1E222B",
        sidebar: "#13161C",
        hover: "#252A35",
        accent: "#4D8DFF",
        success: "#3CCF91",
        warning: "#FFB84D",
        danger: "#FF5C7A",
        text: "#F5F7FA",
        muted: "#B6BEC9",
        subtle: "#7E8794",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        halo: "radial-gradient(circle at top, rgba(77, 141, 255, 0.16), transparent 42%)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
