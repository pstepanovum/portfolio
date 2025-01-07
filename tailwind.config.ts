// tailwind.config.ts

import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Important: Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        'realtime-black': ['Realtime-Black', 'Arial', 'sans-serif'],
        'realtime-bold': ['Realtime-Bold', 'Arial', 'sans-serif'],
        'realtime-light': ['Realtime-Light', 'Arial', 'sans-serif'],
        'realtime-regular': ['Realtime-Regular', 'Arial', 'sans-serif'],
        'realtime-semibold': ['Realtime-SemiBold', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;