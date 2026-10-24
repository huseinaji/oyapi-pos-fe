import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

const { rawPublicVars } = loadEnv({ prefixes: ['API_BASE_URL'] });

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginTailwindcss(),
  ],
  html: {
    title: 'Oyapi POS',
  },
  source: {
    define: {
      'import.meta.env.API_BASE_URL': JSON.stringify(
        rawPublicVars.API_BASE_URL ?? '',
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
