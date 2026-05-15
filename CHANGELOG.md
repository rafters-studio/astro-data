# @rafters/astro-data

## 0.0.1

First runtime release.

- Minimum loader/action runtime: `runLoader`, `runAction`, `invalidate`, hierarchical key matching, page/layout scope, `staleTime`, `refetchOnFocus`.
- React island consumers: `useLoaderData`, `useAction`, `useNavigation`, `useForm`, `<Form>`.
- Web Components delivery: `LoaderConsumer`, `ActionConsumer`, `FormConsumer`.
- Cache adapter seams: `createNanostoresCache`, `createZustandCache`.
- Example Astro 6 app under `tests/examples/app/` exercising the full loop.
- npm trusted publishing wired: `publishConfig.provenance: true`, OIDC `id-token: write` on the release workflow, verify gate (typecheck + lint + format + test) before publish.

No public surface changes since 0.0.0 -- the runtime + npm-prep fill in behind the same exported shape.

## 0.0.0

Initial scaffold. Package shape, public types, no runtime implementations.

The loader and action contract on top of Astro 6, with cache adapter seams for
Nanostores and Zustand, React and Web Components deliveries, and composition
points for smugglr (local-first sync) and kelex (schema-generated forms).
