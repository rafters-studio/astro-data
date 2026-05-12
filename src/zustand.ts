// @rafters/astro-data/zustand — Cache adapter backed by Zustand
//
// Pass `store` to compose with an alternate factory — e.g. smugglr's
// zustand bridge for local-first persistence and sync. Default is
// in-memory Zustand stores.

import type { Cache } from "./index.js";

export interface ZustandStoreFactory {
  createStore<T>(initial?: T): unknown;
}

export interface ZustandCacheOptions {
  store?: ZustandStoreFactory;
}

export function createZustandCache(_opts?: ZustandCacheOptions): Cache {
  throw new Error("not implemented");
}
