// Module-scoped singleton for the default DataLayer.
// configure({ cache }) sets the cache; createDataLayer returns an isolated copy.
//
// The runtime owns exactly one thing: the cache. Per-action and per-loader
// state belongs to the delivery layer (React hooks, element controllers), not
// here -- this package is frameworkless and sits in Astro.

import type { Cache } from "../index.js";

export interface RuntimeState {
  cache: Cache | null;
}

export function createRuntimeState(): RuntimeState {
  return { cache: null };
}

export const defaultState: RuntimeState = createRuntimeState();
