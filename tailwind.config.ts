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
        sans: ["DM Sans", "Segoe UI", "sans-serif"],
        heading: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: "#6C3BFF",
        "primary-light": "#8B5CF6",
        secondary: "#F59E0B",
        accent: "#10B981",
        danger: "#EF4444",
        surface: "#0F0F1A",
        "surface-mid": "#16213E",
        card: "#1E1E35",
        "card-border": "#2D2D50",
      },
    },
  },
  plugins: [],
};

export default config;
