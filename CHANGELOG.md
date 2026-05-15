# @rafters/astro-data

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
