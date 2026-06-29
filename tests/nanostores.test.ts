// nanostores-backed Cache adapter. Verifies the Cache contract (get/set,
// hierarchical invalidation, scoped subscribe), the `persist` seam (called once
// per key with a real nanostores atom), and that it drives the core loader API
// when configured.

import { describe, it, expect } from "vitest";
import type { WritableAtom } from "nanostores";
import { createNanostoresCache, type NanostoresCacheOptions } from "../src/nanostores.js";
import { describeDrivesCoreLoaderApi } from "./_adapter-contract.js";

describe("createNanostoresCache — Cache contract", () => {
  it("round-trips values by key", () => {
    const cache = createNanostoresCache();
    cache.set(["a"], 1);
    expect(cache.get(["a"])).toBe(1);
    expect(cache.get(["missing"])).toBeUndefined();
  });

  it("invalidate is hierarchical — a prefix clears all descendants", () => {
    const cache = createNanostoresCache();
    cache.set(["dash"], "root");
    cache.set(["dash", "stats"], "child");
    cache.set(["other"], "untouched");
    cache.invalidate(["dash"]);
    expect(cache.get(["dash"])).toBeUndefined();
    expect(cache.get(["dash", "stats"])).toBeUndefined();
    expect(cache.get(["other"])).toBe("untouched");
  });

  it("does not collide keys with shared prefixes", () => {
    const cache = createNanostoresCache();
    cache.set(["ab"], "one");
    cache.set(["a", "b"], "two");
    expect(cache.get(["ab"])).toBe("one");
    expect(cache.get(["a", "b"])).toBe("two");
  });

  it("subscribe fires on writes to its key and not others", () => {
    const cache = createNanostoresCache();
    const calls: unknown[] = [];
    const unsubscribe = cache.subscribe(["a"], () => calls.push(cache.get(["a"])));
    cache.set(["b"], "ignored");
    expect(calls).toEqual([]);
    cache.set(["a"], "seen");
    expect(calls).toEqual(["seen"]);
    unsubscribe();
    cache.set(["a"], "after");
    expect(calls).toEqual(["seen"]);
  });

  it("subscribe fires on invalidation of its key", () => {
    const cache = createNanostoresCache();
    cache.set(["a"], "v");
    let fired = false;
    cache.subscribe(["a"], () => {
      fired = true;
    });
    cache.invalidate(["a"]);
    expect(fired).toBe(true);
    expect(cache.get(["a"])).toBeUndefined();
  });
});

describe("createNanostoresCache — persist seam", () => {
  it("calls persist once per key, with a real nanostores atom", () => {
    const seen: Array<{ key: readonly string[]; store: WritableAtom<unknown> }> = [];
    const persist: NanostoresCacheOptions["persist"] = (store, key) => seen.push({ store, key });
    const cache = createNanostoresCache({ persist });

    cache.set(["x"], 1);
    cache.set(["x"], 2); // same key — no second persist call
    cache.subscribe(["y"], () => {});

    expect(seen.map((s) => s.key)).toEqual([["x"], ["y"]]);
    // The handed-out store is a usable nanostores atom: external code (e.g.
    // smugglr's smuggl) can read and subscribe to it.
    const xStore = seen[0]?.store;
    expect(xStore?.get()).toBe(2);
    const external: unknown[] = [];
    const off = xStore?.subscribe((v) => external.push(v));
    cache.set(["x"], 3);
    off?.();
    expect(external).toContain(3);
  });
});

describeDrivesCoreLoaderApi("createNanostoresCache", () => createNanostoresCache());
