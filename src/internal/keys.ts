// Shared cache-key helpers used by every Cache implementation.
//
// Keys are arrays of strings. Hierarchical invalidation matches by prefix:
// invalidate(['a']) reaches ['a'], ['a','b'], ['a','b','c'], etc.

/** True when `target` is `prefix` itself or a descendant of it (prefix match). */
export function isDescendant(target: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > target.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (target[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Collision-free string hash for a key array. JSON encoding keeps element
 * boundaries intact, so `['a','b']` and `['ab']` never collide and a segment
 * may contain any character.
 */
export function hashKey(key: readonly string[]): string {
  return JSON.stringify(key);
}
