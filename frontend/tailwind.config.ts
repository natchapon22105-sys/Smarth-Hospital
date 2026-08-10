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
      },
    },
  },
  plugins: [],
};

export default config;
