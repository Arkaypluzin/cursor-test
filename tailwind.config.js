/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        trello: {
          blue: '#0079bf',
          'blue-hover': '#026aa7',
          'blue-light': '#e4f0f6',
          gray: '#838c91',
          'gray-light': '#f4f5f7',
          'gray-dark': '#172b4d',
        },
      },
    },
  },
  plugins: [],
}
