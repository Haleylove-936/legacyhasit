/** @type {const} */
const themeColors = {
  // Primary — Antique Gold / Warm Walnut for accents
  primary: { light: '#8b5a2b', dark: '#d4a373' },
  // Accent — Rich burgundy or darker walnut
  accent: { light: '#6b3e1b', dark: '#a67c52' },
  // Background — Aged Parchment
  background: { light: '#f4ebd8', dark: '#1e1611' },
  // Surface — Lighter parchment for cards
  surface: { light: '#fdf6e3', dark: '#2b2018' },
  // Text — Deep Espresso for excellent contrast
  foreground: { light: '#2b1d0f', dark: '#f4ebd8' },
  muted: { light: '#806e5d', dark: '#a89f91' },
  // UI chrome — subtle wood grain borders
  border: { light: '#d4ba94', dark: '#4a3b2c' },
  // States
  success: { light: '#4a7c59', dark: '#6fa844' },
  warning: { light: '#b8860b', dark: '#d4a017' },
  error: { light: '#8b2e16', dark: '#a0522d' },
  // Tint alias
  tint: { light: '#8b5a2b', dark: '#d4a373' },
};

module.exports = { themeColors };
