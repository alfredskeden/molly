export type BabyBuddyErrorKind =
  | 'unreachable'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'server';

/** DRF validation errors: field name (or `non_field_errors`) → messages. */
export type FieldErrors = Record<string, string[]>;

export class BabyBuddyError extends Error {
  readonly fields?: FieldErrors;

  constructor(
    readonly kind: BabyBuddyErrorKind,
    options?: { cause?: unknown; fields?: FieldErrors },
  ) {
    super(kind, { cause: options?.cause });
    this.name = 'BabyBuddyError';
    this.fields = options?.fields;
  }
}

type ErrorBody = { detail?: string; timer?: string[] } | null;

// Baby Buddy answers 403 (never 401) for a bad or missing token; only the detail tells it apart
// from a missing permission.
const TOKEN_REJECTED = ['Invalid token.', 'Authentication credentials were not provided.'];

export function errorKindFor(status: number, body: ErrorBody): BabyBuddyErrorKind {
  // An entry POST that references a consumed (deleted) timer answers 400 "Invalid pk", not 404.
  if (status === 400) return referencesGoneTimer(body) ? 'notFound' : 'validation';
  if (status === 403) return TOKEN_REJECTED.includes(body?.detail ?? '') ? 'unauthorized' : 'forbidden';
  if (status === 401) return 'unauthorized';
  if (status === 404) return 'notFound';
  // Anything else (405, 408, 409, 413, a proxy's 429, 5xx) says nothing about the key.
  return 'server';
}

function referencesGoneTimer(body: ErrorBody): boolean {
  return body?.timer?.some((message) => message.includes('does not exist')) ?? false;
}
