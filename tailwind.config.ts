import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg:   "var(--color-bg)",
        s1:   "var(--color-s1)",
        s2:   "var(--color-s2)",
        s3:   "var(--color-s3)",
        s4:   "var(--color-s4)",
        bd:   "var(--color-bd)",
        bd2:  "var(--color-bd2)",
        acc:  "var(--color-acc)",
        acc2: "var(--color-acc2)",
        tx:   "var(--color-tx)",
        tx2:  "var(--color-tx2)",
        tx3:  "var(--color-tx3)",
        grn:  "var(--color-grn)",
        red:  "var(--color-red)",
        blu:  "var(--color-blu)",
        orn:  "var(--color-orn)",
        pur:  "var(--color-pur)",
      },
      fontFamily: {
        sans: ["var(--font-noto)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        sm:  "6px",
        DEFAULT: "10px",
        md:  "14px",
      },
      boxShadow: {
        deep: "0 6px 32px rgba(0,0,0,0.6)",
        acc:  "0 0 28px rgba(232,160,32,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.18s ease",
        float:     "float 3s ease-in-out infinite",
        "slide-up": "slideUp 0.2s ease",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0", transform: "translateY(5px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        float:   { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
