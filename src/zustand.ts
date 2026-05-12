// @rafters/astro-data/zustand — Cache adapter
//
// v0.1 wraps an in-memory hierarchical cache. The `store` parameter is the
// composition seam where smugglr's zustand bridge slots in for local-first
// persistence and sync.

import type { Cache } from "./index.js";
import { createMemoryCache } from "./internal/cache-memory.js";

export interface ZustandStoreFactory {
  createStore<T>(initial?: T): unknown;
}

export interface ZustandCacheOptions {
  store?: ZustandStoreFactory;
}

export function createZustandCache(_opts?: ZustandCacheOptions): Cache {
  return createMemoryCache();
}
