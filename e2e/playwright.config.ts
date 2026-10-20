import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalTeardown: './global-teardown.ts',
  // One Baby Buddy container and child are shared by every test.
  workers: 1,
  use: { baseURL: 'http://localhost:8080', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The production nginx image, rebuilt from a fresh export on every run.
    command:
      'pnpm --filter @molly/app export:web && docker compose -f e2e/docker-compose.yml --profile web up --build --force-recreate molly-web',
    cwd: '..',
    url: 'http://localhost:8080',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
