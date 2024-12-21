const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
    './node_modules/flowbite/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    fontFamily: {
      'logo': [
        'Poppins',
        'ui-sans-serif',
        'system-ui',
      ],
      'sans': [
        'Inter',
        'ui-sans-serif',
        'system-ui',
      ]
    },
    colors: {
      primary: colors.indigo,
    },
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')({
      charts: true,
    }),
  ],
};
