export type NormalisedUrl =
  | { ok: true; url: string }
  | { ok: false; reason: 'empty' | 'invalid' | 'insecure' };

const LAN_HOSTNAMES = [
  /^localhost$/,
  /\.local$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

export function normaliseBaseUrl(input: string): NormalisedUrl {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const url = parseUrl(trimmed);
  if (url?.protocol !== 'https:' && url?.protocol !== 'http:') return { ok: false, reason: 'invalid' };
  if (url.protocol === 'http:' && !LAN_HOSTNAMES.some((pattern) => pattern.test(url.hostname))) {
    return { ok: false, reason: 'insecure' };
  }
  return { ok: true, url: trimmed.replace(/\/+$/, '').replace(/\/api$/, '') };
}

// Not URL.canParse: Hermes' URL polyfill may lack it.
function parseUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}
