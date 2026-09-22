/**
 * Returns true when the object has at least one own key.
 *
 * Used by partial update schemas to reject empty request bodies.
 */
export function hasAtLeastOneKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

/**
 * Returns true when the value is an IANA timezone the runtime understands
 * (for example `America/Bogota`). Guards analytics queries that interpolate
 * the timezone into `AT TIME ZONE`.
 */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
