import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../../e2e/.env.test', import.meta.url));

if (!existsSync(envFile)) {
  throw new Error('e2e/.env.test missing. Start the test Baby Buddy first: pnpm bb:up && pnpm bb:seed');
}

for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]!] ??= match[2];
}
