import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  "#f7f7f8",
          100: "#eeeef1",
          200: "#d8d9df",
          300: "#b6b8c2",
          400: "#8b8e9d",
          500: "#666a7c",
          600: "#4e5263",
          700: "#3d4151",
          800: "#272a36",
          900: "#15171f",
          950: "#0a0b11",
        },
        accent: {
          400: "#5eead4",
          500: "#14b8a6",
          600: "#0d9488",
        },
        danger:  { 500: "#ef4444" },
        warn:    { 500: "#f59e0b" },
        success: { 500: "#22c55e" },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
