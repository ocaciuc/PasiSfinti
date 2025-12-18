import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        candle: {
          DEFAULT: "hsl(var(--candle))",
          glow: "hsl(var(--candle-glow))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "flame-sway": {
          "0%, 100%": { transform: "rotate(-2deg) scaleY(1)" },
          "25%": { transform: "rotate(1deg) scaleY(1.02)" },
          "50%": { transform: "rotate(2deg) scaleY(0.98)" },
          "75%": { transform: "rotate(-1deg) scaleY(1.01)" },
        },
        "flame-flicker": {
          "0%, 100%": { opacity: "0.9", transform: "scaleX(1) scaleY(1)" },
          "20%": { opacity: "0.95", transform: "scaleX(1.02) scaleY(0.98)" },
          "40%": { opacity: "0.85", transform: "scaleX(0.98) scaleY(1.02)" },
          "60%": { opacity: "0.92", transform: "scaleX(1.01) scaleY(0.99)" },
          "80%": { opacity: "0.88", transform: "scaleX(0.99) scaleY(1.01)" },
        },
        "flame-flicker-inner": {
          "0%, 100%": { opacity: "0.95", transform: "scaleY(1)" },
          "33%": { opacity: "1", transform: "scaleY(1.03)" },
          "66%": { opacity: "0.9", transform: "scaleY(0.97)" },
        },
        "flame-core": {
          "0%, 100%": { opacity: "0.9", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        "candle-glow": {
          "0%, 100%": { opacity: "0.3", transform: "translateX(-50%) scale(1)" },
          "50%": { opacity: "0.5", transform: "translateX(-50%) scale(1.1)" },
        },
        "candle-glow-inner": {
          "0%, 100%": { opacity: "0.4", transform: "translateX(-50%) scale(1)" },
          "50%": { opacity: "0.6", transform: "translateX(-50%) scale(1.15)" },
        },
        "particle-1": {
          "0%": { opacity: "0", transform: "translateY(0) translateX(0)" },
          "20%": { opacity: "0.6" },
          "100%": { opacity: "0", transform: "translateY(-40px) translateX(10px)" },
        },
        "particle-2": {
          "0%": { opacity: "0", transform: "translateY(0) translateX(0)" },
          "30%": { opacity: "0.5" },
          "100%": { opacity: "0", transform: "translateY(-35px) translateX(-8px)" },
        },
        "particle-3": {
          "0%": { opacity: "0", transform: "translateY(0) translateX(0)" },
          "25%": { opacity: "0.4" },
          "100%": { opacity: "0", transform: "translateY(-45px) translateX(5px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "flame-sway": "flame-sway 3s ease-in-out infinite",
        "flame-flicker": "flame-flicker 2s ease-in-out infinite",
        "flame-flicker-inner": "flame-flicker-inner 1.5s ease-in-out infinite",
        "flame-core": "flame-core 1s ease-in-out infinite",
        "candle-glow": "candle-glow 4s ease-in-out infinite",
        "candle-glow-inner": "candle-glow-inner 3s ease-in-out infinite",
        "particle-1": "particle-1 4s ease-out infinite",
        "particle-2": "particle-2 5s ease-out infinite 1s",
        "particle-3": "particle-3 4.5s ease-out infinite 2s",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
