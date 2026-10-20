import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Rules use device-local time; pin a zone with DST so results don't depend on the machine.
    env: { TZ: 'Europe/Stockholm' },
  },
});
