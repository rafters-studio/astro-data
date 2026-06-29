// Shared action execution: call the Astro action handle, and on success
// invalidate the module's `revalidates` keys. Used by the React `useAction`
// hook and the Web Components `ActionConsumer` / `FormConsumer` so the
// run-then-revalidate contract lives in exactly one place.

import { invalidate } from "../index.js";
import type { ActionModule, AstroActionFn, AstroActionResult } from "../index.js";

/**
 * Run an action handle and revalidate on success.
 *
 * Mirrors Astro's action result shape: a thrown error is caught and returned
 * as `{ error }` rather than propagated, so every caller gets a uniform result
 * to branch on. Revalidation fires only when the call resolved with `data`.
 */
export async function runActionAndRevalidate<M extends ActionModule, I, O>(
  astroAction: AstroActionFn<I, O>,
  module: M,
  input: I,
): Promise<AstroActionResult<O>> {
  try {
    const result = await astroAction(input);
    if (!result.error && result.data !== undefined && module.revalidates) {
      for (const key of module.revalidates) invalidate(key);
    }
    return result;
  } catch (error) {
    return { error };
  }
}
