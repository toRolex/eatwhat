import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'apps/web') } },
  test: {
    include: ['packages/db/src/__tests__/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
