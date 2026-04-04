import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#fffbff",
        "surface": "#fcf9f8",
        "secondary": "#00639a",
        "outline-variant": "#c7c4d7",
        "on-surface-variant": "#464555",
        "primary-container": "#6560f5",
        "secondary-container": "#2caafe",
        "on-primary-fixed-variant": "#3427c5",
        "error": "#ba1a1a",
        "on-tertiary": "#ffffff",
        "surface-container-high": "#eae7e7",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "primary-fixed-dim": "#c3c1ff",
        "on-tertiary-fixed": "#340042",
        "tertiary": "#9b00be",
        "inverse-primary": "#c3c1ff",
        "on-surface": "#1b1b1c",
        "tertiary-fixed-dim": "#f4aeff",
        "surface-container-low": "#f6f3f2",
        "surface-container-lowest": "#ffffff",
        "inverse-on-surface": "#f3f0ef",
        "on-tertiary-fixed-variant": "#790095",
        "tertiary-fixed": "#fdd6ff",
        "surface-bright": "#fcf9f8",
        "on-background": "#1b1b1c",
        "secondary-fixed-dim": "#95ccff",
        "on-secondary-container": "#003c60",
        "surface-tint": "#4e46dd",
        "on-error": "#ffffff",
        "tertiary-container": "#ba2edd",
        "primary": "#4b44da",
        "outline": "#777586",
        "on-primary-container": "#fffbff",
        "surface-variant": "#e5e2e1",
        "surface-container": "#f0eded",
        "background": "#fcf9f8",
        "on-error-container": "#93000a",
        "on-secondary-fixed-variant": "#004a75",
        "error-container": "#ffdad6",
        "on-primary-fixed": "#0e006a",
        "surface-dim": "#dcd9d9",
        "surface-container-highest": "#e5e2e1",
        "inverse-surface": "#303030",
        "primary-fixed": "#e2dfff",
        "on-secondary-fixed": "#001d32",
        "secondary-fixed": "#cee5ff"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Epilogue", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
};

export default config;
