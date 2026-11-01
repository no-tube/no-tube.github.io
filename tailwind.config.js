/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './app.js', './api-client.js'],
  theme: {
    extend: {
      colors: {
        yt: {
          bg: '#0f0f0f',
          surface: '#1f1f1f',
          chip: '#272727',
          hover: '#3f3f3f',
          line: '#303030'
        }
      }
    }
  },
  plugins: []
};
