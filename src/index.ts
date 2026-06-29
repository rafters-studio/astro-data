// @rafters/astro-data — public API
//
// The loader and action contract on top of Astro 6.
// Everything exported here is part of the public surface and subject to semver.
// Anything under ./internal/ is implementation detail.

import type { APIContext } from "astro";
import type { z } from "astro/zod";
import { defaultState, type RuntimeState } from "./internal/state.js";

// ─── Module shapes ─────────────────────────────────────────────────────────

/**
 * Function form of LoaderKey. Declared via method-shorthand on a synthetic
 * object and immediately indexed -- the bivariance-hack idiom -- so concrete
 * key functions like `(input: { shipId: string }) => ...` structurally satisfy
 * `LoaderKey<unknown>` without falling foul of strictFunctionTypes parameter
 * contravariance. Same shape problem as method shorthand on `loader`/`action`.
 */
type LoaderKeyFn<I> = { fn(input: I): readonly string[] }["fn"];

/**
 * Key form. Static for navigation-stable data. Function form derives the cache
 * key from input so multiple instances of the same loader cache independently
 * (per-row, per-id, per-selection). Hierarchical invalidation by the static
 * prefix works on both forms -- a function-key loader can be invalidated
 * across all inputs by passing the prefix it always produces.
 */
export type LoaderKey<I = unknown> = readonly string[] | LoaderKeyFn<I>;

// Method shorthand syntax (e.g. `loader(args): Promise<O>`) is intentional --
// it gives the property bivariant parameter checking, which is what makes
// `typeof import('../loaders/my-loader')` structurally satisfy `LoaderModule`
// even though the loader's concrete input type is narrower than `unknown`.
// Function-property syntax would force contravariance and break consumers.
export interface LoaderModule<I = unknown, O = unknown> {
  loader(args: LoaderArgs<I>): Promise<O>;
  /** Zod schema for runtime validation. Omit for parameter-less loaders. */
  loaderInput?: z.ZodType<I>;
  /** Cache key, static or input-derived. See LoaderKey. */
  key: LoaderKey<I>;
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
  const state: RuntimeState = { cache: opts.cache };
  return {
    runLoader: ((module, astro, input) =>
      runLoaderWith(state, module, astro, input)) as DataLayer["runLoader"],
    subscribeLoader: ((module, inputOrListener, maybeListener) => {
      const { input, listener } = splitInputAndListener(inputOrListener, maybeListener);
      return subscribeLoaderWith(state, module, input, listener);
    }) as DataLayer["subscribeLoader"],
    getLoaderData: ((module, input) =>
      getLoaderDataWith(state, module, input)) as DataLayer["getLoaderData"],
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

// Resolve a (possibly dynamic) module key to a concrete cache key array.
// Throws if the key is a function but no input was provided -- this is a
// programmer error, not a runtime condition, so it surfaces immediately.
export function resolveLoaderKey<M extends LoaderModule>(
  module: M,
  input?: LoaderInput<M>,
): readonly string[] {
  if (typeof module.key !== "function") return module.key;
  if (input === undefined) {
    throw new Error(
      "@rafters/astro-data: loader has a dynamic key (input -> readonly string[]) but was called without input",
    );
  }
  return (module.key as (input: LoaderInput<M>) => readonly string[])(input);
}

async function runLoaderWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
  astro: APIContext,
  input?: LoaderInput<M>,
): Promise<LoaderOutput<M>> {
  const validated = module.loaderInput
    ? (module.loaderInput.parse(input) as unknown)
    : (input as unknown);
  const resolvedInput = validated as LoaderInput<M>;
  const result = (await module.loader({
    input: resolvedInput as M extends LoaderModule<infer I, unknown> ? I : never,
    astro,
  })) as LoaderOutput<M>;
  getCache(state).set(resolveLoaderKey(module, resolvedInput), result);
  return result;
}

function subscribeLoaderWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
  input: LoaderInput<M> | undefined,
  listener: (data: LoaderOutput<M> | undefined) => void,
): () => void {
  const cache = getCache(state);
  const key = resolveLoaderKey(module, input);
  return cache.subscribe(key, () => {
    listener(cache.get<LoaderOutput<M>>(key));
  });
}

function getLoaderDataWith<M extends LoaderModule>(
  state: RuntimeState,
  module: M,
  input?: LoaderInput<M>,
): LoaderOutput<M> | undefined {
  return getCache(state).get<LoaderOutput<M>>(resolveLoaderKey(module, input));
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

/**
 * Subscribe to a loader's cached data. Fires on cache writes and invalidations.
 *
 * For static-key loaders, call with `(module, listener)`. For dynamic-key
 * loaders, pass the input as the second argument: `(module, input, listener)`.
 * The subscription is scoped to the resolved key for that input.
 */
export function subscribeLoader<M extends LoaderModule>(
  module: M,
  listener: (data: LoaderOutput<M> | undefined) => void,
): () => void;
export function subscribeLoader<M extends LoaderModule>(
  module: M,
  input: LoaderInput<M>,
  listener: (data: LoaderOutput<M> | undefined) => void,
): () => void;
export function subscribeLoader<M extends LoaderModule>(
  module: M,
  inputOrListener: LoaderInput<M> | ((data: LoaderOutput<M> | undefined) => void),
  maybeListener?: (data: LoaderOutput<M> | undefined) => void,
): () => void {
  const { input, listener } = splitInputAndListener(inputOrListener, maybeListener);
  return subscribeLoaderWith(defaultState, module, input, listener);
}

/**
 * Synchronously read a loader's current cached value.
 *
 * For dynamic-key loaders, pass the input to resolve the cache key for that
 * specific instance.
 */
export function getLoaderData<M extends LoaderModule>(
  module: M,
  input?: LoaderInput<M>,
): LoaderOutput<M> | undefined {
  return getLoaderDataWith(defaultState, module, input);
}

/** Manually invalidate a key in the cache. Hierarchical: prefix matches invalidate descendants. */
export function invalidate(key: readonly string[]): void {
  invalidateWith(defaultState, key);
}

/**
 * Set a loader's cached value directly (used to hydrate the client cache from SSR data).
 *
 * For dynamic-key loaders, pass the input as the second argument so the value
 * lands at the right cache key.
 */
export function setLoaderData<M extends LoaderModule>(module: M, value: LoaderOutput<M>): void;
export function setLoaderData<M extends LoaderModule>(
  module: M,
  input: LoaderInput<M>,
  value: LoaderOutput<M>,
): void;
export function setLoaderData<M extends LoaderModule>(
  module: M,
  inputOrValue: LoaderInput<M> | LoaderOutput<M>,
  maybeValue?: LoaderOutput<M>,
): void {
  const { input, value } = splitInputAndValue<M>(module, inputOrValue, maybeValue);
  getCache(defaultState).set(resolveLoaderKey(module, input), value);
}

// Overload disambiguation helpers. The two-arg form on subscribeLoader and
// setLoaderData has an ambiguous second slot (input vs callback/value). We
// resolve by checking whether the second arg is callable (subscribe listener)
// or by checking whether a third arg was provided (setLoaderData value).
function splitInputAndListener<M extends LoaderModule>(
  inputOrListener: LoaderInput<M> | ((data: LoaderOutput<M> | undefined) => void),
  maybeListener: ((data: LoaderOutput<M> | undefined) => void) | undefined,
): {
  input: LoaderInput<M> | undefined;
  listener: (data: LoaderOutput<M> | undefined) => void;
} {
  if (maybeListener !== undefined) {
    return {
      input: inputOrListener as LoaderInput<M>,
      listener: maybeListener,
    };
  }
  return {
    input: undefined,
    listener: inputOrListener as (data: LoaderOutput<M> | undefined) => void,
  };
}

function splitInputAndValue<M extends LoaderModule>(
  _module: M,
  inputOrValue: LoaderInput<M> | LoaderOutput<M>,
  maybeValue: LoaderOutput<M> | undefined,
): { input: LoaderInput<M> | undefined; value: LoaderOutput<M> } {
  if (maybeValue !== undefined) {
    return { input: inputOrValue as LoaderInput<M>, value: maybeValue };
  }
  return { input: undefined, value: inputOrValue as LoaderOutput<M> };
}

// ─── Derived types ─────────────────────────────────────────────────────────

export type LoaderInput<M extends LoaderModule> =
  M["loaderInput"] extends z.ZodType<infer I>
    ? I
    : M["key"] extends (input: infer K) => readonly string[]
      ? K
      : undefined;

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
