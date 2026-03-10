/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trade Republic ähnliche Farben
        'tr-blue': '#0066FF',
        'tr-dark': '#0B0B0B',
        'tr-card': '#1C1C1E',
        'tr-gray': '#8E8E93',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
