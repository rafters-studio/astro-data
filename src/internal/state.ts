// Module-scoped singletons for default DataLayer.
// configure({ cache }) sets these; createDataLayer returns an isolated copy.

import type { Cache } from "../index.js";

type ActionStateEntry = {
  pending: boolean;
  error: Error | null;
  data: unknown;
};

type NavigationState = {
  pending: boolean;
  revalidating: readonly (readonly string[])[];
};

export interface RuntimeState {
  cache: Cache | null;
  actionStates: Map<unknown, ActionStateEntry>;
  actionListeners: Map<unknown, Set<() => void>>;
  navigation: NavigationState;
  navigationListeners: Set<() => void>;
  pendingRevalidations: Map<string, readonly string[]>;
}

export function createRuntimeState(): RuntimeState {
  return {
    cache: null,
    actionStates: new Map(),
    actionListeners: new Map(),
    navigation: { pending: false, revalidating: [] },
    navigationListeners: new Set(),
    pendingRevalidations: new Map(),
  };
}

export const defaultState: RuntimeState = createRuntimeState();
