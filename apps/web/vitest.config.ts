import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fleet/schema': resolve(import.meta.dirname, '../../packages/schema/src/index.ts'),
      '@fleet/layout': resolve(import.meta.dirname, '../../packages/layout/src/index.ts'),
    },
  },
  test: { name: 'web', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
