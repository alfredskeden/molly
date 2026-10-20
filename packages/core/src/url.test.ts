import { describe, expect, it } from 'vitest';

import { normaliseBaseUrl } from './url';

describe('normalising the Baby Buddy URL', () => {
  it('rejects empty input', () => {
    // Given
    const input = '  ';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: false, reason: 'empty' });
  });

  it('keeps a clean https URL', () => {
    // Given
    const input = 'https://baby.example.com';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: true, url: 'https://baby.example.com' });
  });

  it('removes trailing slashes', () => {
    // Given
    const input = 'https://baby.example.com//';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: true, url: 'https://baby.example.com' });
  });

  it('removes an /api suffix', () => {
    // Given
    const input = 'https://baby.example.com/api/';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: true, url: 'https://baby.example.com' });
  });

  it('keeps a path prefix Baby Buddy is served under', () => {
    // Given
    const input = 'https://example.com/babybuddy/api';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: true, url: 'https://example.com/babybuddy' });
  });

  it('rejects http for a public host', () => {
    // Given
    const input = 'http://baby.example.com';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: false, reason: 'insecure' });
  });

  it('allows http for localhost', () => {
    // Given
    const input = 'http://localhost:4777/';

    // When
    const result = normaliseBaseUrl(input);

    // Then
    expect(result).toEqual({ ok: true, url: 'http://localhost:4777' });
  });

  it.each([
    'http://127.0.0.1:8000',
    'http://10.0.0.5',
    'http://172.16.0.2',
    'http://172.31.255.1',
    'http://192.168.1.20:8000',
    'http://babybuddy.local',
  ])('allows http for the LAN address %s', (input) => {
    // Given
    const lanUrl = input;

    // When
    const result = normaliseBaseUrl(lanUrl);

    // Then
    expect(result).toEqual({ ok: true, url: lanUrl });
  });

  it.each(['http://172.32.0.1', 'http://11.0.0.1'])('rejects http for the non-LAN address %s', (input) => {
    // Given
    const publicUrl = input;

    // When
    const result = normaliseBaseUrl(publicUrl);

    // Then
    expect(result).toEqual({ ok: false, reason: 'insecure' });
  });

  it.each(['baby buddy', 'ftp://baby.example.com'])('rejects %s, which is not a web URL', (input) => {
    // Given
    const text = input;

    // When
    const result = normaliseBaseUrl(text);

    // Then
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });
});
