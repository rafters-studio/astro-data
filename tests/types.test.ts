// Type-level regression test for #6. If wrapAction's return type or
// useAction's parameter shape regress to `unknown`, these assertions stop
// compiling and the build fails -- catching the regression without a runtime
// browser harness.
//
// The example app at tests/examples/app exercises the same contract through
// a real Astro project; this file is the fast feedback loop.

import { describe, it, expectTypeOf } from "vitest";
import type { APIContext } from "astro";
import { z } from "astro/zod";
import type { ActionModule, AstroActionFn } from "../src/index.js";
import { wrapAction } from "../src/astro.js";

describe("type contract", () => {
  it("wrapAction returns a typed AstroActionFn matching the module's schemas", () => {
    const actionInput = z.object({ name: z.string() });
    const profileModule = {
      action: async (
        input: z.infer<typeof actionInput>,
        _context: APIContext,
      ): Promise<{ id: string; name: string }> => ({ id: "1", name: input.name }),
      actionInput,
      accept: "form" as const,
    };

    // Concrete action-def-shaped object must satisfy ActionModule without casts.
    expectTypeOf(profileModule).toMatchTypeOf<ActionModule>();

    // The fake defineAction stands in for `import { defineAction } from "astro:actions"`.
    // Real Astro defineAction is verified via tests/examples/app's astro check pass.
    const fakeDefineAction = ((opts: unknown) => opts) as unknown as Parameters<
      typeof wrapAction
    >[0];

    const wrapped = wrapAction(fakeDefineAction, profileModule);
    expectTypeOf(wrapped).toEqualTypeOf<
      AstroActionFn<{ name: string }, { id: string; name: string }>
    >();
  });
});
