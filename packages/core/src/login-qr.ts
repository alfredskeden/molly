import { normaliseBaseUrl } from './url';

export type QrLogin = { baseUrl: string; token: string };

const PREFIX = 'BABYBUDDY-LOGIN:';

/** Baby Buddy's "Add device" QR code: `BABYBUDDY-LOGIN:{"url": …, "api_key": …, "session_cookies": …}`. */
export function loginFromQr(text: string): QrLogin | null {
  if (!text.startsWith(PREFIX)) return null;
  const payload = parseJson(text.slice(PREFIX.length));
  if (typeof payload?.url !== 'string' || typeof payload.api_key !== 'string' || !payload.api_key) return null;
  const { url, api_key: token } = payload;
  let normalised = normaliseBaseUrl(url);
  // Behind a TLS-terminating proxy Baby Buddy sees plain http and puts that in the code.
  if (!normalised.ok && normalised.reason === 'insecure') {
    normalised = normaliseBaseUrl(url.replace(/^http:/, 'https:'));
  }
  return normalised.ok ? { baseUrl: normalised.url, token } : null;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
