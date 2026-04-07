/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FDF3E8",
        surface: "#FFFFFF",
        primary: "#7C1805",
        primaryLight: "#A03217",
        accent: "#36555A",
        accentLight: "#D66B27",
        muted: "#E8DDD0",
        mutedForeground: "#6B5B4E",
        border: "rgba(124,24,5,0.1)",
        success: "#36555A",
        warning: "#DAB257",
        error: "#7C1805",
        info: "#D9B2CF",
        amarelo: "#DAB257",
        laranja: "#D66B27",
        rosa: "#D9B2CF",
        verde: "#36555A",
        offwhite: "#FDF3E8",
      },
      fontFamily: {
        heading: ["Bricolage Grotesque", "sans-serif"],
        body: ["Bricolage Grotesque", "sans-serif"],
        script: ["Calligraffitti", "cursive"],
        essay: ["Lora", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
