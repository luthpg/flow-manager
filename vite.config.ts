/// <reference types="vitest" />

import { cityGasRouter } from '@ciderjs/city-gas/plugin';
import { gasnuki } from '@ciderjs/gasnuki/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { gas } from 'vite-plugin-google-apps-script';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      include: ['src/**/*.ts', 'src/**/*.tsx', 'server/**/*.ts'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, '.'),
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
    cityGasRouter(),
    gasnuki(),
    gas(),
    viteSingleFile(),
  ],
});
