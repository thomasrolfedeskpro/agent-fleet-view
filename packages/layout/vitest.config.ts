import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@fleet/schema': resolve(import.meta.dirname, '../../packages/schema/src/index.ts'),
      '@fleet/layout': resolve(import.meta.dirname, '../../packages/layout/src/index.ts'),
      '@fleet/simulator': resolve(import.meta.dirname, '../../packages/simulator/src/index.ts'),
    },
  },
  test: { name: 'layout', include: ['src/**/*.test.ts'] },
});
