// @rafters/astro-data/astro — Astro-side helpers
//
// These helpers run inside an Astro project. The package itself can't import
// `astro:actions` (it's a virtual module Astro provides), so the consumer
// passes `defineAction` in.

import type { APIContext } from "astro";
import type { z } from "astro/zod";
import type { ActionModule } from "./index.js";

type DefineActionFn = <I, O>(opts: {
  input: z.ZodType<I>;
  accept?: "json" | "form";
  handler: (input: I, context: APIContext) => Promise<O>;
}) => unknown;

/**
 * Register an action module with Astro's action system.
 *
 * Usage in `src/actions/index.ts`:
 *
 *     import { defineAction } from "astro:actions"
 *     import { wrapAction } from "@rafters/astro-data/astro"
 *     import * as updateProfile from "../action-defs/update-profile"
 *
 *     export const server = {
 *       updateProfile: wrapAction(defineAction, updateProfile),
 *     }
 */
export function wrapAction<M extends ActionModule>(
  defineAction: DefineActionFn,
  module: M,
): unknown {
  return defineAction({
    input: module.actionInput,
    accept: module.accept,
    handler: module.action,
  });
}
