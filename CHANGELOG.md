# @rafters/astro-data

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
