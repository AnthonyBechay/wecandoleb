import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Primary — Lebanese cedar, a refined emerald-green
        cedar: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // Accent — warm Mediterranean sunset
        sunset: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // Secondary — Bekaa wine, a proper burgundy
        wine: {
          50: "#fdf3f5",
          100: "#fbe4ea",
          200: "#f6c6d3",
          300: "#ee9db3",
          400: "#e06a8d",
          500: "#cf4069",
          600: "#b62b55",
          700: "#8f1f42",
          800: "#761b39",
          900: "#631832",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(6, 78, 59, 0.08), 0 4px 16px -4px rgba(6, 78, 59, 0.06)",
        lift: "0 12px 32px -8px rgba(6, 78, 59, 0.16)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
