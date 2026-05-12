// @rafters/astro-data/nanostores — Cache adapter backed by Nanostores
//
// Pass `store` to compose with an alternate factory — e.g. smugglr's
// nanostores bridge for local-first persistence and sync. Default is
// in-memory atoms.

import type { Cache } from "./index.js";

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
  store?: NanostoresStoreFactory;
}

export function createNanostoresCache(_opts?: NanostoresCacheOptions): Cache {
  throw new Error("not implemented");
}
