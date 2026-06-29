// zustand-backed Cache adapter. Verifies the Cache contract, that subscribe is
// selective (fires only when its own key's slot changes), the `middleware`
// seam, and that it drives the core loader API when configured.

import { describe, it, expect } from "vitest";
import type { StateCreator } from "zustand/vanilla";
import {
  createZustandCache,
  type ZustandCacheState,
  type ZustandCacheOptions,
} from "../src/zustand.js";
import { describeDrivesCoreLoaderApi } from "./_adapter-contract.js";

describe("createZustandCache — Cache contract", () => {
  it("round-trips values by key", () => {
    const cache = createZustandCache();
    cache.set(["a"], 1);
    expect(cache.get(["a"])).toBe(1);
    expect(cache.get(["missing"])).toBeUndefined();
  });

  it("invalidate is hierarchical — a prefix clears all descendants", () => {
    const cache = createZustandCache();
    cache.set(["dash"], "root");
    cache.set(["dash", "stats"], "child");
    cache.set(["other"], "untouched");
    cache.invalidate(["dash"]);
    expect(cache.get(["dash"])).toBeUndefined();
    expect(cache.get(["dash", "stats"])).toBeUndefined();
    expect(cache.get(["other"])).toBe("untouched");
  });

  it("subscribe is selective — fires for its key only", () => {
    const cache = createZustandCache();
    const calls: unknown[] = [];
    const unsubscribe = cache.subscribe(["a"], () => calls.push(cache.get(["a"])));
    cache.set(["b"], "ignored");
    expect(calls).toEqual([]);
    cache.set(["a"], "seen");
    expect(calls).toEqual(["seen"]);
    cache.invalidate(["a"]);
    expect(calls).toEqual(["seen", undefined]);
    unsubscribe();
    cache.set(["a"], "after");
    expect(calls).toEqual(["seen", undefined]);
  });
});

describe("createZustandCache — middleware seam", () => {
  it("wraps the initializer before the store is created", () => {
    let wrapped = false;
    const middleware: NonNullable<ZustandCacheOptions["middleware"]> = (init) => {
      wrapped = true;
      const passthrough: StateCreator<ZustandCacheState, [], []> = (set, get, api) =>
        init(set, get, api);
      return passthrough;
    };
    const cache = createZustandCache({ middleware });
    expect(wrapped).toBe(true);
    cache.set(["a"], 1);
    expect(cache.get(["a"])).toBe(1);
  });
});

describeDrivesCoreLoaderApi("createZustandCache", () => createZustandCache());
