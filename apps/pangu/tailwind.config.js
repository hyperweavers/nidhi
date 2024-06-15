const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
    './node_modules/flowbite/**/*.js'
  ],
  darkMode: 'media',
  theme: {
    colors: {
      primary: colors.purple,
    },
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')
  ],
};
