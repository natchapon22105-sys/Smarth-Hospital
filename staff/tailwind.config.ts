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
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "var(--font-display)", "sans-serif"],
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
        "float-circle-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.15" },
          "25%": { transform: "translate(30px, -40px) scale(1.1)", opacity: "0.25" },
          "50%": { transform: "translate(60px, 10px) scale(0.9)", opacity: "0.15" },
          "75%": { transform: "translate(20px, 50px) scale(1.05)", opacity: "0.2" },
        },
        "float-circle-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.12" },
          "33%": { transform: "translate(-40px, 30px) scale(1.15)", opacity: "0.22" },
          "66%": { transform: "translate(-10px, -50px) scale(0.85)", opacity: "0.15" },
        },
        "float-circle-3": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)", opacity: "0.1" },
          "50%": { transform: "translate(50px, -30px) rotate(180deg)", opacity: "0.2" },
        },
        "float-circle-4": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.08" },
          "50%": { transform: "translate(-30px, 40px) scale(1.2)", opacity: "0.18" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "bg-pan": "bg-pan 24s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "float-1": "float-circle-1 18s ease-in-out infinite",
        "float-2": "float-circle-2 22s ease-in-out infinite",
        "float-3": "float-circle-3 15s ease-in-out infinite",
        "float-4": "float-circle-4 20s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
