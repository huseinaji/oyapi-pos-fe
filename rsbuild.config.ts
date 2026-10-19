import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
  ],
  source: {
    define: {
      'import.meta.env.API_BASE_URL': JSON.stringify(
        process.env.API_BASE_URL ?? '',
      ),
    },
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: process.env.API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
