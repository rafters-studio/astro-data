// @rafters/astro-data/astro — Astro-side helpers
//
// These helpers run inside an Astro project. The package itself can't import
// `astro:actions` (it's a virtual module Astro provides), so the consumer
// passes `defineAction` in.

import type { APIContext } from "astro";
import type { ActionInput, ActionModule, ActionOutput, AstroActionFn } from "./index.js";

// We can't import `astro:actions` (it's a virtual module Astro provides) and
// Astro's real `defineAction` signature uses conditional generics + Zod 4
// internal types that aren't worth mirroring precisely (it would break on
// every Astro minor). Instead we use the "any function" idiom: `opts: never`
// in parameter position is contravariantly compatible with any concrete opts
// shape Astro might pass, so the consumer's `defineAction` slots in cleanly.
// The compile-time guarantee consumers care about is wrapAction's RETURN
// type -- AstroActionFn<I, O> -- which carries the schemas end-to-end.
type DefineActionFn = (opts: never) => unknown;

interface InternalDefineActionOpts {
  input?: unknown;
  accept?: "json" | "form";
  handler: (input: unknown, context: APIContext) => Promise<unknown>;
}

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
 *
 * Returns an AstroActionFn typed by the module's input/output schemas, so
 * `actions.updateProfile` ends up properly typed downstream and useAction
 * accepts it without casts.
 */
export function wrapAction<M extends ActionModule>(
  defineAction: DefineActionFn,
  module: M,
): AstroActionFn<ActionInput<M>, ActionOutput<M>> {
  const call = defineAction as unknown as (
    opts: InternalDefineActionOpts,
  ) => AstroActionFn<ActionInput<M>, ActionOutput<M>>;
  return call({
    input: module.actionInput,
    accept: module.accept,
    handler: module.action as (input: unknown, context: APIContext) => Promise<unknown>,
  });
}
