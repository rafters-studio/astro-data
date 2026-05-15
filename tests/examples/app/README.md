# @rafters/astro-data example app

End-to-end demo of the loader / action / cache contract on Astro 6 with React islands.

## What this demonstrates

- **Loader module** (`src/loaders/profile.ts`) — Zod-validated input, typed return, hierarchical key
- **Action module** (`src/action-defs/update-profile.ts`) — Zod input, declared `revalidates` targets
- **Astro Action registration** (`src/actions/index.ts`) — `wrapAction(defineAction, module)` from `@rafters/astro-data/astro`
- **SSR loader run** (`src/pages/index.astro`) — `runLoader(module, Astro, input)` in frontmatter, data inlined into HTML
- **React island subscription** (`src/components/Dashboard.tsx`) — `useLoaderData(module, initialData)` subscribes to the cache
- **Action invocation with revalidation** — `useAction(actions.x, module)` runs the action and invalidates the module's `revalidates` keys
- **Cache refresh from action result** — `setLoaderData(module, result.data)` bridges action output back into the loader cache (v0.2 will make this declarative)

## Run

From the package root:

```bash
pnpm build                              # builds @rafters/astro-data dist/
pnpm --filter @rafters/astro-data-example-app dev
```

Then open <http://localhost:4321/>.

## Why this lives in `tests/examples/`

The example is a real workspace consumer of `@rafters/astro-data`. It's where contract changes get smoke-tested end-to-end before publishing.
