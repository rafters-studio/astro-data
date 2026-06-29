# @rafters/astro-data

## 0.1.0

Three exported subpaths were shipped as facades in 0.0.x. They are now real, with tests that run them.

- **`/elements` was hollow.** Every `LoaderConsumer` / `ActionConsumer` / `FormConsumer` method threw `"not implemented"`, while `package.json` exported the subpath and the README listed it as shipping. They are now working framework-agnostic controllers: `LoaderConsumer` subscribes a host element to a loader (callback + `astro-data:loader` event), `ActionConsumer` runs an action with revalidation (callback + `astro-data:action` event), `FormConsumer` binds a `<form>`, serializes FormData, and runs the action. Covered by `tests/elements.spec.ts` in real chromium.
- **`/nanostores` ignored its options.** `createNanostoresCache` accepted a `store` factory, discarded it, and returned an in-memory Map -- no nanostores anywhere, despite the dep and the "local-first" headline. It is now backed by real nanostores atoms (consumable by `@nanostores/react|solid|vue|lit`) with a `persist(store, key)` seam that wires durability per key. Composes with `@smugglr/nanostores`'s `smuggl(atom, ...)` -- the real bridge API, not the fictional `smugglrBridge({ db })` the README invented.
- **`/zustand` ignored its options.** Same failure. Now a real vanilla zustand store with selective per-key subscription and a `middleware` seam that composes with `@smugglr/zustand`'s `smuggl(...)` middleware.
- **Removed the navigation phantom.** The quickstart island imported `useNavigation` and `useForm` from `/react`; neither was ever implemented or specced (navigation tracking lives in rafters, not here). The example now uses the real `useAction(actions.foo, module)` signature and `update.pending`. `RuntimeState` is collapsed to just `{ cache }`: the `navigation` / `navigationListeners` / `pendingRevalidations` fields and the `actionStates` / `actionListeners` maps were written and read by nothing. The package is frameworkless and sits in Astro -- per-action and per-loader state belongs to the delivery layer (React hooks, element controllers), so the runtime owns only the cache.
- **Internals.** Shared `isDescendant` / `hashKey` (`internal/keys.ts`) and a shared `runActionAndRevalidate` (`internal/run-action.ts`) used by both the React `useAction` and the element controllers, so the run-then-revalidate contract lives in one place.
- **Test infra.** Browser provider migrated to the vitest 4.1 factory API (`@vitest/browser-playwright`); the old string `provider: "playwright"` no longer started.

No breaking changes to the core (`@rafters/astro-data`) or `/react` type surface. The `/nanostores` and `/zustand` option shapes changed (`store` -> `persist` / `middleware`), but the prior options were no-ops, so no working consumer relied on them.

## 0.0.3

Input-derived loader keys (#7).

- **LoaderModule.key** accepts either a static `readonly string[]` (existing) or a function `(input: I) => readonly string[]` (new). The function form caches independently per input -- the per-row / per-id / per-selection case huttspawn was on raw fetch for.
- **Hierarchical invalidation works on both forms.** Keep the function's first element stable as the static prefix; `invalidate(['my-loader-prefix'])` then clears every dynamic-key entry under it.
- **Consumer-side helpers gained input-aware overloads** for dynamic-key loaders: `subscribeLoader(module, input, listener)`, `getLoaderData(module, input)`, `setLoaderData(module, input, value)`, `useLoaderData(module, input, initial?)`. Static-key consumers are unchanged -- the two-arg form still works as before.
- **LoaderInput<M>** now falls back to inferring the input type from the key function's parameter when `loaderInput` is omitted.
- New public export: `resolveLoaderKey(module, input?)` for consumers that need the resolved cache key (mirrors smugglr's `key` resolution if you compose the two).

Subtle behavior fix: when a loader has no `loaderInput` validator, `runLoader(module, astro, input)` now passes the raw input through to the loader function. Previously it always passed `undefined`. This is the intended behavior for dynamic-key loaders (which may need the input for the key but not for validation) and matches what static-key loaders already did via `loaderInput`. If you had a loader without `loaderInput` that relied on receiving `undefined` regardless of caller input, declare `loaderInput: z.undefined()` to restore the prior behavior.

No breaking changes to the type surface. All existing static-key call sites continue to compile and behave the same.

## 0.0.2

Type unification and README discipline pass, driven by huttspawn's 0.0.1 dogfood report (3 admin surfaces, 5 actions, 3 loaders).

- **#6 Drop the casts.** `LoaderModule.loader` and `ActionModule.action` now use method shorthand syntax for bivariant parameter checking, so `typeof import('./loader-or-action-def-file')` structurally satisfies the module type without `as any`. `wrapAction` returns `AstroActionFn<ActionInput<M>, ActionOutput<M>>` instead of `unknown`, so the `actions` export carries types end-to-end and `useAction(actions.foo, fooDef)` compiles cast-free. Verified by the example app's `astro check` (zero errors, zero casts) and a new type-level regression test (`tests/types.test.ts`).
- **#8 README discipline.** Three callouts added under Concepts: (1) the consumer-pull revalidation model and what it means for SPA-flavored admins; (2) action-def modules are isomorphic and ride into the client bundle, so server-only deps belong inside the handler body; (3) Astro 6 removed `Astro.locals.runtime.env` -- use `import { env } from 'cloudflare:workers'` instead. Loaders section also documents raw `fetch` as the deliberate escape hatch for intra-page input-keyed data.
- **#7 Input-derived loader keys.** Deferred from 0.2 after consumer audit (huttspawn: one site; example app: zero; astro-meta: zero — below the threshold for shipping API surface speculatively). Documented raw fetch as the escape hatch for intra-page selection state; will revisit if demand crosses the bar.

No behavior changes. No breaking changes -- existing `as any` casts continue to compile; consumers can drop them at their convenience.

## 0.0.1

First runtime release.

- Minimum loader/action runtime: `runLoader`, `runAction`, `invalidate`, hierarchical key matching, page/layout scope, `staleTime`, `refetchOnFocus`.
- React island consumers: `useLoaderData`, `useAction`, `useNavigation`, `useForm`, `<Form>`.
- Web Components delivery: `LoaderConsumer`, `ActionConsumer`, `FormConsumer`.
- Cache adapter seams: `createNanostoresCache`, `createZustandCache`.
- Example Astro 6 app under `tests/examples/app/` exercising the full loop.

Publishing doctrine aligned with `@rafters/*` canon (rafters + mail):

- Tag-triggered OIDC trusted publishing via GitHub Actions. `git tag vX.Y.Z && git push origin vX.Y.Z` fires `release.yml`.
- `npm publish --access=public --provenance` direct. No changesets, no tokens.
- `sideEffects: false` to let consumer bundlers tree-shake the subpath exports.

## 0.0.0

Initial scaffold. Package shape, public types, no runtime implementations.

The loader and action contract on top of Astro 6, with cache adapter seams for
Nanostores and Zustand, React and Web Components deliveries, and composition
points for smugglr (local-first sync) and kelex (schema-generated forms).
