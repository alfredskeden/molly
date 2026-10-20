import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

import { testEnv } from './test-env';

/** Built by the Playwright web server; see playwright.config.ts. */
const IMAGE = 'molly-web:e2e';

test('responses carry a CSP whose connect-src allows only the Baby Buddy origin', async ({ request }) => {
  // Given
  const page = '/';

  // When
  const response = await request.get(page);

  // Then
  const csp = response.headers()['content-security-policy'] ?? '';
  expect(csp).toContain(`connect-src ${testEnv.baseUrl};`);
  expect(csp).toContain("script-src 'self';");
  expect(csp).toContain("frame-ancestors 'none'");
});

test('hashed assets are cached long-term', async ({ request }) => {
  // Given
  const html = await (await request.get('/')).text();
  const script = /src="(\/_expo\/static\/js\/[^"]+\.js)"/.exec(html)?.[1] ?? '';

  // When
  const response = await request.get(script);

  // Then
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('max-age=31536000');
  expect(response.headers()['cache-control']).toContain('immutable');
});

test('index.html is never cached', async ({ request }) => {
  // Given
  const page = '/';

  // When
  const response = await request.get(page);

  // Then
  expect(response.headers()['cache-control']).toBe('no-cache');
});

test('a deep link reloads into the app', async ({ page }) => {
  // Given
  const deepLink = '/onboarding/checklist';

  // When
  const response = await page.goto(deepLink);

  // Then
  expect(response?.status()).toBe(200);
  expect(response?.headers()['cache-control']).toBe('no-cache');
  await expect(page.getByText('Connect to Baby Buddy')).toBeVisible();
});

test('the image contains no Baby Buddy URL or key', () => {
  // Given
  const secrets = [testEnv.baseUrl, 'localhost:4778', testEnv.adminToken, testEnv.parentA.token, testEnv.parentB.token];

  // When
  const files = execFileSync('docker', ['run', '--rm', '--entrypoint', 'sh', IMAGE, '-c', 'cat /usr/share/nginx/html/index.html /usr/share/nginx/html/_expo/static/js/web/*.js /etc/nginx/templates/*'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  // Then
  expect(secrets.filter((secret) => files.includes(secret))).toEqual([]);
});

test('the image refuses to start without BABY_BUDDY_ORIGIN', () => {
  // Given
  const noOrigin = ['run', '--rm', IMAGE];

  // When
  const run = () => execFileSync('docker', noOrigin, { encoding: 'utf8', stdio: 'pipe', timeout: 20_000 });

  // Then
  expect(run).toThrow(/BABY_BUDDY_ORIGIN/);
});

test('the image refuses an origin that would change the CSP', () => {
  // Given
  const injected = ['run', '--rm', '-e', "BABY_BUDDY_ORIGIN=https://baby.example.com; script-src 'unsafe-inline'", IMAGE];

  // When
  const run = () => execFileSync('docker', injected, { encoding: 'utf8', stdio: 'pipe', timeout: 20_000 });

  // Then
  expect(run).toThrow(/must look like/);
});
