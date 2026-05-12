// @rafters/astro-data/nanostores — Cache adapter
//
// v0.1 wraps an in-memory hierarchical cache. The `store` parameter is the
// composition seam where smugglr's nanostores bridge slots in for local-first
// persistence and sync. Until smugglr's bridge API lands, the parameter is
// reserved and the adapter behaves as in-memory.

import type { Cache } from "./index.js";
import { createMemoryCache } from "./internal/cache-memory.js";

/**
 * Factory shape the cache adapter consumes.
 *
 * v0.1 ships a loose type pending smugglr's nanostores bridge API.
 * When smugglr's surface lands, this narrows without a public-API break
 * for consumers using the default factory.
 */
export interface NanostoresStoreFactory {
  createMap<T>(initial?: T): unknown;
}

export interface NanostoresCacheOptions {
  /** Reserved: pass smugglr's nanostores bridge here for local-first storage. */
  store?: NanostoresStoreFactory;
}

export function createNanostoresCache(_opts?: NanostoresCacheOptions): Cache {
  // v0.1: backed by in-memory cache. Smugglr bridge composition lands in v0.2.
  return createMemoryCache();
}
