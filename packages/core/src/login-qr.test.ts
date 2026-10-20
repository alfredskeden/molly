import { describe, expect, it } from 'vitest';

import { loginFromQr } from './login-qr';

const code = (payload: object) => `BABYBUDDY-LOGIN:${JSON.stringify(payload)}`;

describe("Baby Buddy's add-device QR code", () => {
  it('gives the address and API key', () => {
    // Given
    const scanned = code({ url: 'http://10.0.0.20:8000/', api_key: 'abc123', session_cookies: {} });

    // When
    const login = loginFromQr(scanned);

    // Then
    expect(login).toEqual({ baseUrl: 'http://10.0.0.20:8000', token: 'abc123' });
  });

  it('upgrades a public http address to https, as a proxy may hide the real scheme', () => {
    // Given
    const scanned = code({ url: 'http://baby.example.com/', api_key: 'abc123', session_cookies: {} });

    // When
    const login = loginFromQr(scanned);

    // Then
    expect(login).toEqual({ baseUrl: 'https://baby.example.com', token: 'abc123' });
  });

  it.each(['https://baby.example.com', 'hello', ''])('ignores %j, which is not a Baby Buddy login code', (text) => {
    // Given
    const scanned = text;

    // When
    const login = loginFromQr(scanned);

    // Then
    expect(login).toBeNull();
  });

  it.each([
    'BABYBUDDY-LOGIN:{not json',
    code({ url: 'http://10.0.0.20:8000/' }),
    code({ api_key: 'abc123' }),
    code({ url: 'http://10.0.0.20:8000/', api_key: 42 }),
    code({ url: 'baby buddy', api_key: 'abc123' }),
  ])('ignores the broken or incomplete code %s', (text) => {
    // Given
    const scanned = text;

    // When
    const login = loginFromQr(scanned);

    // Then
    expect(login).toBeNull();
  });
});
