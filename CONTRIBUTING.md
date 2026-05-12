# Contributing to @rafters/astro-data

Issues and PRs welcome.

## Setup

```bash
pnpm install
```

## Test surfaces

- `pnpm test` — unit tests (`tests/**/*.test.ts`)
- `pnpm test:spec` — component behavior tests (`tests/**/*.spec.ts`) via Vitest Browser Mode with Playwright
- `pnpm test:all` — both

Use `.test.ts` for pure logic (key matching, revalidation contract, type-level checks). Use `.spec.ts` for hook and component behavior in a real browser.

## Quality gates

- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `oxlint`
- `pnpm format:check` — `oxfmt --check`

`lefthook` runs the relevant subset on `pre-commit` and the full `pnpm test:all` on `pre-push`.

## Releasing

Changes are versioned with [Changesets](https://github.com/changesets/changesets).

```bash
pnpm changeset           # describe the change
pnpm changeset version   # bump version + update CHANGELOG
git commit -am "release"
git push                 # CI publishes via OIDC trusted publishing
```

No long-lived `NPM_TOKEN` exists in this repo. Releases are minted per-publish via GitHub Actions OIDC. Provenance attestations ship on every release.

## Scope

### What belongs in this package

- The loader/action contract on top of Astro
- `Cache` interface and adapters (Nanostores, Zustand)
- React, Web Components, vanilla TS deliveries
- Hierarchical key revalidation

### What does NOT belong

- Database integration — write Drizzle (or anything) directly inside your loader
- Form rendering polish — compose with [kelex](https://github.com/rafters-studio/kelex) for schema-generated UI
- Local-first sync — compose with [smugglr](https://smugglr.dev) for SQLite sync
- Specific framework opinions beyond Astro

The package is a contract. Keep it small.
