// The Android widget library, notification module and haptics must never reach the web bundle (see *.android.tsx).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MARKERS = ['RNWidgetBackgroundTask', 'react-native-android-widget', 'drawWidgetById', 'MollyNotify', 'segment-frequent-tick'];
const dist = 'apps/molly/dist';

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.js') ? [path] : [];
  });
}

const found = files(dist).flatMap((file) => {
  const code = readFileSync(file, 'utf8');
  return MARKERS.filter((marker) => code.includes(marker)).map((marker) => `${file}: ${marker}`);
});

if (found.length) {
  console.error(`Android-only code in the web bundle:\n${found.join('\n')}`);
  process.exit(1);
}
console.log('web bundle ok: no widget, notification or haptics code');
