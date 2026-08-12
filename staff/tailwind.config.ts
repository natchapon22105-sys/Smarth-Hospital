import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#142625",
        teal: {
          DEFAULT: "#0E7C7B",
          dark: "#0A5F5E",
          light: "#E4F2F1",
        },
        amber: {
          DEFAULT: "#E8A33D",
          dark: "#C6822A",
        },
        bg: "#F4F7F6",
        surface: "#FFFFFF",
        line: "#DCE7E5",
        danger: "#C24444",
        navy: {
          DEFAULT: "#0B1F3A",
          dark: "#071427",
          deeper: "#040D1C",
          light: "#1E3A5F",
          accent: "#3B82F6",
        },
      },
      fontFamily: {
        display: ["var(--font-sarabun)", "sans-serif"],
        body: ["var(--font-inter)", "var(--font-sarabun)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,38,37,0.04), 0 8px 24px rgba(20,38,37,0.06)",
        "navy-card": "0 8px 32px rgba(4,13,28,0.35)",
        "navy-glow": "0 0 24px rgba(59,130,246,0.35)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bg-pan": {
          "0%": { transform: "scale(1.05) translate(0, 0)" },
          "50%": { transform: "scale(1.12) translate(-1.5%, -1.5%)" },
          "100%": { transform: "scale(1.05) translate(0, 0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "bg-pan": "bg-pan 24s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
