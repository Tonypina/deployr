// Strip HTML tags and trim whitespace from user-supplied plain-text strings.
// Applied in Zod schemas so every route benefits automatically.

export function clean(s: string): string {
  return s.trim().replace(/<[^>]*>/g, "");
}

export function cleanEmail(s: string): string {
  return s.trim().toLowerCase();
}

// Optional-field variants preserve `undefined` / `null` as-is.
export function cleanOpt(s: string | undefined): string | undefined {
  return s !== undefined ? clean(s) : undefined;
}

export function cleanEmailOpt(s: string | undefined): string | undefined {
  return s !== undefined ? cleanEmail(s) : undefined;
}

export function cleanOptNull(s: string | null | undefined): string | null | undefined {
  return s != null ? clean(s) : s;
}
