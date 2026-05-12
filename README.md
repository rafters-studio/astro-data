# @rafters/astro-data

The loader and action contract Astro is missing.

Astro has pages, server islands, and Actions. It does not have a loader-and-revalidation contract — the pattern Remix made famous, RR7 carried, and TanStack Router copied. This package is that contract, layered on Astro 6, with end-to-end Zod types, hierarchical revalidation, and a small public surface.

Not a framework. A contract.

## Status

Pre-release. Designed against Astro 6. Not yet published to npm.

## Install

```bash
pnpm add @rafters/astro-data
```

Pick a cache adapter:

```bash
pnpm add nanostores @nanostores/react   # recommended -- works across React, Solid, Vue, Svelte islands
# or
pnpm add zustand                         # React-only apps
```

Astro re-exports its pinned Zod as `astro/zod`. Import `z` from there for action and loader schemas; no separate Zod install required.

## Quickstart

Configure the cache at app entry:

```ts
// src/data.ts
import { configure } from "@rafters/astro-data";
import { createNanostoresCache } from "@rafters/astro-data/nanostores";

configure({ cache: createNanostoresCache() });
```

Define a loader:

```ts
// src/loaders/dashboard.ts
import { z } from "astro/zod";
import type { LoaderArgs } from "@rafters/astro-data";
import { profiles, stats } from "../db/schema";
import { eq } from "drizzle-orm";

export const loaderInput = z.object({ userId: z.string() });

export async function loader({ input, astro }: LoaderArgs<z.infer<typeof loaderInput>>) {
  const db = astro.locals.db;
  return {
    profile: await db.select().from(profiles).where(eq(profiles.id, input.userId)).get(),
    stats: await db.select().from(stats).where(eq(stats.userId, input.userId)).all(),
  };
}
```

Define an action:

```ts
// src/actions/update-profile.ts
import { z } from "astro/zod";
import type { APIContext } from "astro";

export const actionInput = z.object({ name: z.string().min(1) });
export const accept = "form";
export const revalidates = [["dashboard"]] as const;

export async function action(input: z.infer<typeof actionInput>, ctx: APIContext) {
  await ctx.locals.db.updateProfile(input);
}
```

Use in a page:

```astro
---
import * as Dashboard from '../loaders/dashboard'
import { runLoader } from '@rafters/astro-data'
import DashboardIsland from '../components/Dashboard'

const data = await runLoader(Dashboard, Astro, { userId: Astro.locals.user.id })
---
<DashboardIsland initialData={data} client:load />
```

Consume from an island:

```tsx
// src/components/Dashboard.tsx
import { useLoaderData, useAction, useNavigation } from "@rafters/astro-data/react";
import * as Dashboard from "../loaders/dashboard";
import * as UpdateProfile from "../actions/update-profile";

export default function Dashboard({
  initialData,
}: {
  initialData: Awaited<ReturnType<typeof Dashboard.loader>>;
}) {
  const data = useLoaderData(Dashboard, initialData);
  const update = useAction(UpdateProfile);
  const nav = useNavigation();

  return (
    <>
      <p>{data.profile?.name}</p>
      <button onClick={() => update.run({ name: "New" })} disabled={update.pending}>
        Save
      </button>
      {nav.pending && <span>Saving…</span>}
    </>
  );
}
```

That's the whole contract. Loaders fetch. Actions revalidate. Islands consume.

## Concepts

### Loaders

A loader is a typed, keyed, validated async function. It runs server-side — at build time during SSG, at request time during SSR — and returns data for pages and islands.

```ts
{
  loader: (args: LoaderArgs<I>) => Promise<O>
  loaderInput?: z.ZodType<I>
  key?: readonly string[]
  scope?: 'page' | 'layout'
  staleTime?: number
  refetchOnFocus?: boolean
}
```

### Actions

An action is a typed, validated server function that may revalidate loaders. Actions ride Astro's `defineAction` runtime: `<form method="POST" action={registerAction(module)}>` works with zero JavaScript, typed errors via `ActionError` and `isInputError()`, session integration via `Astro.session`.

```ts
{
  action: (input: I, context: APIContext) => Promise<O>
  actionInput: z.ZodType<I>
  accept?: 'json' | 'form'
  revalidates?: readonly (readonly string[])[]
}
```

### Hierarchical keys

Keys are arrays. Invalidation matches by prefix.

```
['dashboard']                          invalidates: dashboard, dashboard.*
['dashboard', 'stats']                 invalidates: dashboard.stats, dashboard.stats.*
['dashboard', 'stats', 'today']        invalidates: dashboard.stats.today only
```

This is RR7's model and TanStack Query's opt-in. It's the right default for an action-revalidates-loaders contract: mutation scope is naturally hierarchical.

### Revalidation, not refetching

`invalidate` marks loaders stale. Re-running happens on the next consumer demand — the next navigation that needs the loader, or the next island that subscribes to its key. Actions stay cheap; revalidation stays lazy.

## Composition

The package is the floor. Two optional addons multiply it.

### smugglr — local-first SQLite sync

[smugglr](https://smugglr.dev) is a SQLite sync engine. Pass its nanostores bridge into the cache adapter and your data becomes durable, syncs across devices, and survives offline.

```ts
import { createNanostoresCache } from "@rafters/astro-data/nanostores";
import { smugglrBridge } from "smugglr/nanostores";

configure({
  cache: createNanostoresCache({ store: smugglrBridge({ db: "app" }) }),
});
```

Your loaders and actions don't change. Smugglr keeps the underlying storage in sync with your D1 (or Turso, or rqlite, or any other SQLite backend) in the background. Mutations land locally first, sync when network returns.

### kelex — schema-generated forms

[kelex](https://github.com/rafters-studio/kelex) reads an action's Zod schema and generates the form for you — fields, labels, validation, error placement, pending UI.

```astro
---
import * as UpdateProfile from '../actions/update-profile'
import { kelexForm } from 'kelex/astro'
---
{kelexForm(UpdateProfile)}
```

Without kelex, hand-write your inputs against the schema (the `<Form>` component from `@rafters/astro-data/react` is the bare-bones wrapper). With kelex, the form writes itself.

### Independence

Both are optional. Adopt zero, one, or both. The package works without either. Each is a force multiplier where it earns its weight.

## Public surface

See [`src/index.ts`](./src/index.ts) for the full contract. Anything not exported there is internal and not subject to semver.

### Subpath exports

| Entry                            | Contents                                                           |
| -------------------------------- | ------------------------------------------------------------------ |
| `@rafters/astro-data`            | Core types, primitives, `Cache` interface                          |
| `@rafters/astro-data/react`      | `useLoaderData`, `useAction`, `useNavigation`, `useForm`, `<Form>` |
| `@rafters/astro-data/elements`   | `LoaderConsumer`, `ActionConsumer`, `FormConsumer` controllers     |
| `@rafters/astro-data/nanostores` | `createNanostoresCache`                                            |
| `@rafters/astro-data/zustand`    | `createZustandCache`                                               |

## Why not TanStack Query?

TanStack Query solves the problem of _client-rendered apps with no server data_. Astro renders pages on the server — your initial data is already in the HTML, with no loading flash on first paint. Query's biggest value proposition doesn't apply.

What you still want — request dedup, optimistic updates, hierarchical revalidation, staleness control for long sessions — this package provides, sized for Astro's model.

If your app is a pure client SPA without Astro, use Query. If it's an Astro app with islands, use this. Different problem shapes, different tools.

## Supply chain

This package publishes via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC from GitHub Actions). No long-lived `NPM_TOKEN` exists anywhere. Every release ships with [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements). The release workflow is in [`.github/workflows/release.yml`](./.github/workflows/release.yml) and is the authoritative source.

If you see a version of this package on npm without provenance, do not install it. Open an issue.

The package has zero runtime dependencies. Peer dependencies (`astro`, `react`, your chosen cache adapter) are listed minimally.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
