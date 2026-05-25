import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Söhne",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: ["Tiempos Text", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        // Claude-style warm palette
        bg: {
          DEFAULT: "#FAF9F5",
          dark: "#262624",
        },
        panel: {
          DEFAULT: "#F0EEE5",
          dark: "#1F1E1D",
        },
        ink: {
          DEFAULT: "#3D3929",
          dark: "#F5F4EE",
          muted: "#8B8676",
          mutedDark: "#A8A398",
        },
        accent: {
          DEFAULT: "#C96442",
          hover: "#B5573A",
        },
        bubble: {
          user: "#F0EEE5",
          userDark: "#2D2C2A",
        },
        border: {
          DEFAULT: "#E8E5D8",
          dark: "#3A3937",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        pulse: "pulse 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
