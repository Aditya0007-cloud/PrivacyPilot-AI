/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12201b",
        canopy: "#0f3d2e",
        mint: "#dff8e8",
        coral: "#f46d5e",
        amber: "#f5bd4f",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(18, 32, 27, 0.12)",
      },
    },
  },
  plugins: [],
};
