// @rafters/astro-data — public API
//
// The loader and action contract on top of Astro 6.
// Everything exported here is part of the public surface and subject to semver.
// Anything under ./internal/ is implementation detail.

import type { APIContext } from "astro";
import type { z } from "astro/zod";

// ─── Module shapes ─────────────────────────────────────────────────────────
// A data module is a TS file that exports any combination of:
//   loader, loaderInput, action, actionInput, accept, key, scope, staleTime,
//   refetchOnFocus, revalidates, reads
// Modules are imported as namespaces (`import * as Dashboard from './...'`)
// and passed to the runtime primitives.

export interface LoaderModule<I = unknown, O = unknown> {
  loader: (args: LoaderArgs<I>) => Promise<O>;
  /** Zod schema for runtime validation. Omit for parameter-less loaders. */
  loaderInput?: z.ZodType<I>;
  /** Override the filesystem-derived key. Hierarchical: prefix matches invalidate descendants. */
  key?: readonly string[];
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
  action: (input: I, context: APIContext) => Promise<O>;
  /** Zod schema. Required because Astro's defineAction requires it. */
  actionInput: z.ZodType<I>;
  /** Forwards to Astro's defineAction. Default: 'json'. */
  accept?: "json" | "form";
  /** Hierarchical key arrays to invalidate after success. */
  revalidates?: readonly (readonly string[])[];
}

export type DataModule = LoaderModule | ActionModule | (LoaderModule & ActionModule);

// ─── Call-site contexts ────────────────────────────────────────────────────

export interface LoaderArgs<I = unknown> {
  /** Validated against loaderInput if present, otherwise undefined at runtime. */
  input: I;
  /** Astro's full request context. */
  astro: APIContext;
}

// ─── Cache contract ────────────────────────────────────────────────────────
// The seam where any reactive store plugs in. Hierarchical key semantics:
//   invalidate(['dashboard']) -> also invalidates ['dashboard', 'stats'].

export interface Cache {
  get<T>(key: readonly string[]): T | undefined;
  set<T>(key: readonly string[], value: T): void;
  /** Hierarchical: prefix match invalidates all descendants. */
  invalidate(key: readonly string[]): void;
  subscribe(key: readonly string[], listener: () => void): () => void;
}

// ─── Configuration ─────────────────────────────────────────────────────────

export function configure(_opts: { cache: Cache }): void {
  throw new Error("not implemented");
}

export function createDataLayer(_opts: { cache: Cache }): DataLayer {
  throw new Error("not implemented");
}

export interface DataLayer {
  runLoader: typeof runLoader;
  registerAction: typeof registerAction;
  subscribeLoader: typeof subscribeLoader;
  getLoaderData: typeof getLoaderData;
  subscribeAction: typeof subscribeAction;
  subscribeNavigation: typeof subscribeNavigation;
}

// ─── Primitives ────────────────────────────────────────────────────────────

/**
 * Run a loader server-side. Validates input via loaderInput, calls loader,
 * writes the result to the cache at the module's key, returns the value.
 * Used in `.astro` frontmatter and in server islands.
 */
export function runLoader<M extends LoaderModule>(
  _module: M,
  _astro: APIContext,
  _input?: LoaderInput<M>,
): Promise<LoaderOutput<M>> {
  throw new Error("not implemented");
}

/**
 * Register an action module with Astro's action system. Returns an Astro
 * Action handle that can be used with `<form action={handle}>` or called
 * directly as `await handle(input)`. Adds cache revalidation on success.
 */
export function registerAction<M extends ActionModule>(_module: M): AstroActionHandle<M> {
  throw new Error("not implemented");
}

/** Subscribe to a loader's cached data. Fires on cache writes and invalidations. */
export function subscribeLoader<M extends LoaderModule>(
  _module: M,
  _listener: (data: LoaderOutput<M> | undefined) => void,
): () => void {
  throw new Error("not implemented");
}

/** Synchronously read a loader's current cached value. */
export function getLoaderData<M extends LoaderModule>(_module: M): LoaderOutput<M> | undefined {
  throw new Error("not implemented");
}

/** Subscribe to an action's pending/error/result state. */
export function subscribeAction<M extends ActionModule>(
  _module: M,
  _listener: (state: ActionState<M>) => void,
): () => void {
  throw new Error("not implemented");
}

/** Subscribe to global navigation state — which loader keys are revalidating. */
export function subscribeNavigation(_listener: (state: Navigation) => void): () => void {
  throw new Error("not implemented");
}

// ─── Derived types ─────────────────────────────────────────────────────────

export type LoaderInput<M extends LoaderModule> =
  M["loaderInput"] extends z.ZodType<infer I> ? I : undefined;

export type LoaderOutput<M extends LoaderModule> = Awaited<ReturnType<M["loader"]>>;

export type ActionInput<M extends ActionModule> =
  M["actionInput"] extends z.ZodType<infer I> ? I : never;

export type ActionOutput<M extends ActionModule> = Awaited<ReturnType<M["action"]>>;

/** Compatible with Astro's `defineAction` return shape. */
export interface AstroActionHandle<M extends ActionModule> {
  (input: ActionInput<M>): Promise<{ data?: ActionOutput<M>; error?: unknown }>;
  orThrow: (input: ActionInput<M>) => Promise<ActionOutput<M>>;
}

export interface ActionState<M extends ActionModule> {
  pending: boolean;
  error: Error | null;
  data: ActionOutput<M> | null;
}

export interface Navigation {
  pending: boolean;
  revalidating: readonly (readonly string[])[];
}

// ─── Re-exports for consumer convenience ───────────────────────────────────

export type { APIContext } from "astro";
export { z } from "astro/zod";
