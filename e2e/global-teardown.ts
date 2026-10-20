import { execFileSync } from 'node:child_process';

// Stopping `docker compose up` (the web server command) leaves the container running.
export default function globalTeardown() {
  execFileSync('docker', ['compose', '-f', 'e2e/docker-compose.yml', '--profile', 'web', 'rm', '--stop', '--force', 'molly-web'], {
    cwd: `${__dirname}/..`,
    stdio: 'ignore',
  });
}
