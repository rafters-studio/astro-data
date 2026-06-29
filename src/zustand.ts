// @rafters/astro-data/zustand — zustand-backed Cache
//
// One vanilla zustand store holds the whole cache as a `{ values }` record.
// Per-key subscription is selective: a subscriber fires only when its own
// key's slot changes, not on every write. The `middleware` seam wraps the
// store initializer so smugglr's `smuggl(...)` middleware can persist the
// cache slice to SQLite.

import { createStore } from "zustand/vanilla";
import type { StateCreator, StoreApi } from "zustand/vanilla";
import type { Cache } from "./index.js";
import { hashKey, isDescendant } from "./internal/keys.js";

/** The store shape. Exposed so a `middleware` projector can be typed against it. */
export interface ZustandCacheState {
  values: Record<string, unknown>;
}

export interface ZustandCacheOptions {
  /**
   * Wrap the store initializer before the store is created. Apply smugglr's
   * zustand `smuggl(...)` middleware here to persist the cache slice:
   *
   *     import { smuggl } from "@smugglr/zustand";
   *
   *     createZustandCache({
   *       middleware: (init) =>
   *         smuggl(init, { smugglr, executor, table: "astro_data", key: "cache" }),
   *     });
   *
   * Omit it for an in-memory zustand cache.
   */
  middleware?: (
    initializer: StateCreator<ZustandCacheState, [], []>,
  ) => StateCreator<ZustandCacheState, [], []>;
}

const initCacheState: StateCreator<ZustandCacheState, [], []> = () => ({ values: {} });

/**
 * Cache backed by a vanilla zustand store. Pass `middleware` to persist the
 * cache slice via smugglr; omit it for in-memory storage.
 */
export function createZustandCache(opts: ZustandCacheOptions = {}): Cache {
  const store: StoreApi<ZustandCacheState> = createStore<ZustandCacheState>()(
    opts.middleware ? opts.middleware(initCacheState) : initCacheState,
  );

  // Key arrays kept alongside their hashes so hierarchical invalidation can
  // prefix-match without re-parsing the hash.
  const keyArrays = new Map<string, readonly string[]>();

  return {
    get<T>(key: readonly string[]): T | undefined {
      return store.getState().values[hashKey(key)] as T | undefined;
    },

    set<T>(key: readonly string[], value: T): void {
      const h = hashKey(key);
      keyArrays.set(h, key);
      store.setState((s) => ({ values: { ...s.values, [h]: value } }));
    },

    invalidate(key: readonly string[]): void {
      store.setState((s) => {
        const next = { ...s.values };
        for (const [h, arr] of keyArrays) {
          if (isDescendant(arr, key)) delete next[h];
        }
        return { values: next };
      });
    },

    subscribe(key: readonly string[], listener: () => void): () => void {
      const h = hashKey(key);
      return store.subscribe((state, prev) => {
        if (state.values[h] !== prev.values[h]) listener();
      });
    },
  };
}
