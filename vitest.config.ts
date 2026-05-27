import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web'),
    },
  },
  test: {
    include: [
      'apps/web/app/**/*.test.ts',
      'apps/web/lib/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
