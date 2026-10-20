import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./test/load-test-env.ts'],
    // Every file talks to the same Baby Buddy container and child, so run them one at a time.
    fileParallelism: false,
    testTimeout: 10_000,
  },
});
