/**
 * Returns true when the object has at least one own key.
 *
 * Used by partial update schemas to reject empty request bodies.
 */
export function hasAtLeastOneKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}
