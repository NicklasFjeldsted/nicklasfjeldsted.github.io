/**
 * This file exists purely so IDEs (WebStorm/VSCode) that expect a classic
 * tailwind.config.js can locate and index the project's Tailwind setup.
 * It is NOT used by the Tailwind v4 build pipeline — that is driven entirely
 * by `@import "tailwindcss"` in src/tailwind.css and @tailwindcss/postcss.
 *
 * Keep `content` in sync with wherever class names are authored.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
};

