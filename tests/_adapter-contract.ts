// Shared adapter contract. Any Cache implementation must drive the core loader
// API the same way; this suite is parametrized by the cache factory so the
// nanostores and zustand suites assert it without copy-paste.

import { beforeEach, describe, expect, it } from "vitest";
import {
  configure,
  getLoaderData,
  invalidate,
  setLoaderData,
  subscribeLoader,
  type Cache,
  type LoaderArgs,
  type LoaderModule,
} from "../src/index.js";

const Loader = {
  key: ["profile"] as const,
  async loader(_args: LoaderArgs<undefined>) {
    return { name: "seed" };
  },
} satisfies LoaderModule<undefined, { name: string }>;

/** Assert a cache, wired through `configure`, drives the core loader API. */
export function describeDrivesCoreLoaderApi(label: string, makeCache: () => Cache): void {
  describe(`${label} — drives the core loader API`, () => {
    beforeEach(() => {
      configure({ cache: makeCache() });
    });

    it("setLoaderData / getLoaderData / subscribeLoader / invalidate work end-to-end", () => {
      const calls: Array<{ name: string } | undefined> = [];
      const unsubscribe = subscribeLoader(Loader, (data) => calls.push(data));
      setLoaderData(Loader, { name: "A" });
      expect(getLoaderData(Loader)).toEqual({ name: "A" });
      expect(calls).toEqual([{ name: "A" }]);
      invalidate(["profile"]);
      expect(getLoaderData(Loader)).toBeUndefined();
      unsubscribe();
    });
  });
}
