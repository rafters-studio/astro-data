// Dynamic loader keys (#7). Runtime tests that cover:
// - Static-key loaders still work (back-compat)
// - Dynamic-key loaders cache per-input
// - Hierarchical invalidation by the static prefix wipes all per-input entries
// - Subscribe on a dynamic loader is scoped to one resolved key
// - resolveLoaderKey throws when called on a dynamic-key module without input

import { describe, it, expect, expectTypeOf, beforeEach } from "vitest";
import {
  configure,
  getLoaderData,
  invalidate,
  resolveLoaderKey,
  setLoaderData,
  subscribeLoader,
  type LoaderArgs,
  type LoaderInput,
  type LoaderModule,
} from "../src/index.js";
import { createMemoryCache } from "../src/internal/cache-memory.js";

beforeEach(() => {
  configure({ cache: createMemoryCache() });
});

describe("static-key loaders (back-compat)", () => {
  const StaticLoader = {
    key: ["profile"] as const,
    async loader(_args: LoaderArgs<undefined>) {
      return { name: "Static" };
    },
  } satisfies LoaderModule<undefined, { name: string }>;

  it("setLoaderData(module, value) writes at module.key", () => {
    setLoaderData(StaticLoader, { name: "A" });
    expect(getLoaderData(StaticLoader)).toEqual({ name: "A" });
  });

  it("subscribeLoader(module, listener) fires on writes to module.key", () => {
    const calls: Array<{ name: string } | undefined> = [];
    const unsubscribe = subscribeLoader(StaticLoader, (data) => calls.push(data));
    setLoaderData(StaticLoader, { name: "B" });
    expect(calls).toEqual([{ name: "B" }]);
    unsubscribe();
  });
});

describe("dynamic-key loaders", () => {
  interface ShipEligibility {
    shipId: string;
    canFly: boolean;
  }
  const ShipEligibility = {
    key: (input: { shipId: string }) => ["gsf-ship-eligibility", input.shipId] as const,
    async loader({ input }: LoaderArgs<{ shipId: string }>): Promise<ShipEligibility> {
      return { shipId: input.shipId, canFly: true };
    },
  } satisfies LoaderModule<{ shipId: string }, ShipEligibility>;

  it("caches per-input -- different inputs get independent cache entries", () => {
    setLoaderData(ShipEligibility, { shipId: "A" }, { shipId: "A", canFly: true });
    setLoaderData(ShipEligibility, { shipId: "B" }, { shipId: "B", canFly: false });
    expect(getLoaderData(ShipEligibility, { shipId: "A" })).toEqual({
      shipId: "A",
      canFly: true,
    });
    expect(getLoaderData(ShipEligibility, { shipId: "B" })).toEqual({
      shipId: "B",
      canFly: false,
    });
  });

  it("hierarchical prefix invalidation wipes all per-input entries", () => {
    setLoaderData(ShipEligibility, { shipId: "A" }, { shipId: "A", canFly: true });
    setLoaderData(ShipEligibility, { shipId: "B" }, { shipId: "B", canFly: false });
    invalidate(["gsf-ship-eligibility"]);
    expect(getLoaderData(ShipEligibility, { shipId: "A" })).toBeUndefined();
    expect(getLoaderData(ShipEligibility, { shipId: "B" })).toBeUndefined();
  });

  it("subscribe on dynamic loader is scoped to the resolved key for one input", () => {
    const calls: ShipEligibility[] = [];
    const unsubscribe = subscribeLoader(ShipEligibility, { shipId: "A" }, (data) => {
      if (data) calls.push(data);
    });
    setLoaderData(ShipEligibility, { shipId: "B" }, { shipId: "B", canFly: false });
    expect(calls).toEqual([]);
    setLoaderData(ShipEligibility, { shipId: "A" }, { shipId: "A", canFly: true });
    expect(calls).toEqual([{ shipId: "A", canFly: true }]);
    unsubscribe();
  });

  it("resolveLoaderKey throws when dynamic key is asked to resolve without input", () => {
    expect(() => resolveLoaderKey(ShipEligibility)).toThrow(/dynamic key.*called without input/);
  });
});

describe("LoaderInput type inference", () => {
  it("infers input from key function when loaderInput is omitted", () => {
    const DynamicNoSchema = {
      key: (input: { id: string }) => ["x", input.id] as const,
      async loader(_args: LoaderArgs<{ id: string }>) {
        return null;
      },
    } satisfies LoaderModule<{ id: string }, null>;
    expectTypeOf<LoaderInput<typeof DynamicNoSchema>>().toEqualTypeOf<{ id: string }>();
  });

  it("undefined when neither loaderInput nor a function key are present", () => {
    const StaticNoInput = {
      key: ["x"] as const,
      async loader(_args: LoaderArgs<undefined>) {
        return null;
      },
    } satisfies LoaderModule<undefined, null>;
    expectTypeOf<LoaderInput<typeof StaticNoInput>>().toEqualTypeOf<undefined>();
  });
});
