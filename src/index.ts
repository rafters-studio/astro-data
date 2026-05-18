// @rafters/astro-data — public API
//
// The loader and action contract on top of Astro 6.
// Everything exported here is part of the public surface and subject to semver.
// Anything under ./internal/ is implementation detail.

import type { APIContext } from "astro";
import type { z } from "astro/zod";
import { defaultState, type RuntimeState } from "./internal/state.js";

// ─── Module shapes ─────────────────────────────────────────────────────────

// Method shorthand syntax (e.g. `loader(args): Promise<O>`) is intentional --
// it gives the property bivariant parameter checking, which is what makes
// `typeof import('../loaders/my-loader')` structurally satisfy `LoaderModule`
// even though the loader's concrete input type is narrower than `unknown`.
// Function-property syntax would force contravariance and break consumers.
export interface LoaderModule<I = unknown, O = unknown> {
  loader(args: LoaderArgs<I>): Promise<O>;
  /** Zod schema for runtime validation. Omit for parameter-less loaders. */
  loaderInput?: z.ZodType<I>;
  /** Hierarchical key. Required in v0.1 (filesystem derivation: v0.2). */
  key: readonly string[];
  /** 'layout' loaders are visible to nested pages; fetch in parallel on navigation. */
  scope?: "page" | "layout";
  /** ms before cached data is considered stale on subscribe. Default: Infinity. */
  staleTime?: number;
  /** Refetch when the window regains focus. Default: false. */
  refetchOnFocus?: boolean;
  /** Reserved for v0.2+ — declarative table reads for sync-driven revalidation. */
  reads?: readonly unknown[];
}

export interface ActionModule<I = unknown, O = unknown> {
  action(input: I, context: APIContext): Promise<O>;
  /** Zod schema. Required because Astro's defineAction requires it. */
  actionInput: z.ZodType<I>;
  /** Forwards to Astro's defineAction. Default: 'json'. */
  accept?: "json" | "form";
  /** Hierarchical key arrays to invalidate on success. */
  revalidates?: readonly (readonly string[])[];
}

export type DataModule = LoaderModule | ActionModule | (LoaderModule & ActionModule);

// ─── Call-site contexts ────────────────────────────────────────────────────

export interface LoaderArgs<I = unknown> {
  input: I;
  astro: APIContext;
}

// ─── Cache contract ────────────────────────────────────────────────────────

export interface Cache {
  get<T>(key: readonly string[]): T | undefined;
  set<T>(key: readonly string[], value: T): void;
  /** Hierarchical: prefix match invalidates all descendants. */
  invalidate(key: readonly string[]): void;
  subscribe(key: readonly string[], listener: () => void): () => void;
}

// ─── Configuration ─────────────────────────────────────────────────────────

export function configure(opts: { cache: Cache }): void {
  defaultState.cache = opts.cache;
}

export function createDataLayer(opts: { cache: Cache }): DataLayer {
  const state: RuntimeState = {
    cache: opts.cache,
    actionStates: new Map(),
    actionListeners: new Map(),
    navigation: { pending: false, revalidating: [] },
    navigationListeners: new Set(),
    pendingRevalidations: new Map(),
  };
  return {
    runLoader: ((module, astro, input) =>
      runLoaderWith(state, module, astro, input)) as DataLayer["runLoader"],
    subscribeLoader: ((module, listener) =>
      subscribeLoaderWith(state, module, listener)) as DataLayer["subscribeLoader"],
    getLoaderData: ((module) => getLoaderDataWith(state, module)) as DataLayer["getLoaderData"],
    invalidate: (key) => invalidateWith(state, key),
    cache: opts.cache,
  };
}

export interface DataLayer {
  runLoader: typeof runLoader;
  subscribeLoader: typeof subscribeLoader;
  getLoaderData: typeof getLoaderData;
  invalidate: (key: readonly string[]) => void;
  cache: Cache;
}

// ─── Primitives ────────────────────────────────────────────────────────────

function getCache(state: RuntimeState): Cache {
  if (!state.cache) {
    throw new Error("@rafters/astro-data: configure({ cache }) must be called before runtime use");
  }
  return state.cache;
}

async function runLoaderWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
  astro: APIContext,
  input?: LoaderInput<M>,
): Promise<LoaderOutput<M>> {
  const validated = module.loaderInput
    ? (module.loaderInput.parse(input) as unknown)
    : (undefined as unknown);
  const result = (await module.loader({
    input: validated as M extends LoaderModule<infer I, unknown> ? I : never,
    astro,
  })) as LoaderOutput<M>;
  getCache(state).set(module.key, result);
  return result;
}

function subscribeLoaderWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
  listener: (data: LoaderOutput<M> | undefined) => void,
): () => void {
  const cache = getCache(state);
  return cache.subscribe(module.key, () => {
    listener(cache.get<LoaderOutput<M>>(module.key));
  });
}

function getLoaderDataWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
): LoaderOutput<M> | undefined {
  return getCache(state).get<LoaderOutput<M>>(module.key);
}

function invalidateWith(state: RuntimeState, key: readonly string[]): void {
  getCache(state).invalidate(key);
}

/**
 * Run a loader server-side. Validates input via loaderInput, calls loader,
 * writes the result to the cache at the module's key, returns the value.
 * Used in `.astro` frontmatter and in server islands.
 */
export function runLoader<M extends LoaderModule>(
  module: M,
  astro: APIContext,
  input?: LoaderInput<M>,
): Promise<LoaderOutput<M>> {
  return runLoaderWith(defaultState, module, astro, input);
}

/** Subscribe to a loader's cached data. Fires on cache writes and invalidations. */
export function subscribeLoader<M extends LoaderModule>(
  module: M,
  listener: (data: LoaderOutput<M> | undefined) => void,
): () => void {
  return subscribeLoaderWith(defaultState, module, listener);
}

/** Synchronously read a loader's current cached value. */
export function getLoaderData<M extends LoaderModule>(module: M): LoaderOutput<M> | undefined {
  return getLoaderDataWith(defaultState, module);
}

/** Manually invalidate a key in the cache. Hierarchical: prefix matches invalidate descendants. */
export function invalidate(key: readonly string[]): void {
  invalidateWith(defaultState, key);
}

/** Set a loader's cached value directly (used to hydrate the client cache from SSR data). */
export function setLoaderData<M extends LoaderModule>(module: M, value: LoaderOutput<M>): void {
  getCache(defaultState).set(module.key, value);
}

// ─── Derived types ─────────────────────────────────────────────────────────

export type LoaderInput<M extends LoaderModule> =
  M["loaderInput"] extends z.ZodType<infer I> ? I : undefined;

export type LoaderOutput<M extends LoaderModule> = Awaited<ReturnType<M["loader"]>>;

export type ActionInput<M extends ActionModule> =
  M["actionInput"] extends z.ZodType<infer I> ? I : never;

export type ActionOutput<M extends ActionModule> = Awaited<ReturnType<M["action"]>>;

// ─── Astro action handle shape ─────────────────────────────────────────────
// Mirrors what astro:actions' generated handles return: a callable that takes
// the input and resolves to { data?, error? }. wrapAction (in ./astro) returns
// this shape, useAction (in ./react) accepts this shape. Defined here so the
// astro and react subpaths share one source of truth.

export type AstroActionResult<O> = { data?: O; error?: unknown };
export type AstroActionFn<I, O> = (input: I) => Promise<AstroActionResult<O>>;

// ─── Re-exports for consumer convenience ───────────────────────────────────

export type { APIContext } from "astro";
export { z } from "astro/zod";
