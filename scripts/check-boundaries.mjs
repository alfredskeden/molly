// packages/api and packages/core run in the widget's headless task: no React, Expo or app code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = /from\s+['"](react|react-native|expo[^'"]*|@expo\/[^'"]*|@react-native[^'"]*|@molly\/app|\.\.\/\.\.\/apps[^'"]*)['"]/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const offenders = ['packages/api/src', 'packages/core/src'].flatMap(files).flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) => (FORBIDDEN.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
);

if (offenders.length) {
  console.error(`Forbidden imports in shared packages:\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log('boundaries ok: packages/api and packages/core import no React, Expo or app code');
