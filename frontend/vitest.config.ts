import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@point-of-sale/webbluetooth-receipt-printer': fileURLToPath(
        new URL(
          '../node_modules/@point-of-sale/webbluetooth-receipt-printer/dist/webbluetooth-receipt-printer.esm.js',
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
