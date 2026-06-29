// @rafters/astro-data/nanostores — nanostores-backed Cache
//
// Each cache key is a real nanostores atom. That buys two things the bare
// in-memory cache cannot: subscription that any nanostores binding
// (@nanostores/react, /solid, /vue, /lit) can consume directly, and a
// per-atom `persist` seam where a durability layer — e.g. smugglr's
// `smuggl(atom, ...)` — wires SQLite-backed local-first storage.
//
// Hierarchical invalidation (invalidate(['a']) clears ['a','b'], ...) is
// implemented over the atom registry: descendants are reset to undefined,
// which both clears the value and notifies that key's subscribers.

import { atom } from "nanostores";
import type { WritableAtom } from "nanostores";
import type { Cache } from "./index.js";
import { hashKey, isDescendant } from "./internal/keys.js";

export interface NanostoresCacheOptions {
  /**
   * Called once per cache key, the first time that key is written or
   * subscribed, with the backing nanostores atom and the key array. Use it to
   * attach durable storage. With smugglr:
   *
   *     import { smuggl } from "@smugglr/nanostores";
   *
   *     createNanostoresCache({
   *       persist: (store, key) =>
   *         smuggl(store, { smugglr, executor, table: "astro_data", key: key.join("/") }),
   *     });
   *
   * Omit it for a purely in-memory (but still nanostores-reactive) cache.
   */
  persist?: (store: WritableAtom<unknown>, key: readonly string[]) => void;
}

interface Entry {
  store: WritableAtom<unknown>;
  key: readonly string[];
}

/**
 * Cache backed by nanostores atoms. Pass `persist` to wire each atom to a
 * durability layer; omit it for in-memory reactive storage.
 */
export function createNanostoresCache(opts: NanostoresCacheOptions = {}): Cache {
  const entries = new Map<string, Entry>();

  function entryFor(key: readonly string[]): Entry {
    const h = hashKey(key);
    let entry = entries.get(h);
    if (!entry) {
      entry = { store: atom<unknown>(undefined), key };
      entries.set(h, entry);
      opts.persist?.(entry.store, key);
    }
    return entry;
  }

  return {
    get<T>(key: readonly string[]): T | undefined {
      return entries.get(hashKey(key))?.store.get() as T | undefined;
    },

    set<T>(key: readonly string[], value: T): void {
      entryFor(key).store.set(value);
    },

    invalidate(key: readonly string[]): void {
      for (const entry of entries.values()) {
        if (isDescendant(entry.key, key)) entry.store.set(undefined);
      }
    },

    subscribe(key: readonly string[], listener: () => void): () => void {
      // listen() fires on change only (not immediately on attach), matching the
      // in-memory cache's subscribe semantics.
      return entryFor(key).store.listen(() => listener());
    },
  };
}
