/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#081226",
        mist: "#eef4ff",
        coral: "#ff7a59",
        sea: "#0f766e",
        sky: "#4f8cff",
        sand: "#fde68a"
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top left, rgba(79, 140, 255, 0.35), transparent 45%), radial-gradient(circle at bottom right, rgba(255, 122, 89, 0.25), transparent 35%)"
      },
      boxShadow: {
        panel: "0 24px 70px rgba(8, 18, 38, 0.18)"
      },
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
