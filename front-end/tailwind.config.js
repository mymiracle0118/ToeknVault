const colors = require('tailwindcss/colors');

module.exports = {
  // mode: 'jit',
  purge: ['./src/**/*.{js,ts,jsx,tsx}', './public/index.html'],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        'pink-themed': {
          DEFAULT: '#d526fb',
        },
        'purple-themed': {
          DEFAULT: '#7B54FF',
          light: '#2f2f49',
        },
        'green-themed': {
          DEFAULT: '#70EC9D',
        },
        modal: {
          DEFAULT: '#222231',
          border: '#3B3B58',
          form: '#1E1E2E',
        },
      },
    },
  },
  variants: {},
  plugins: [],
};
