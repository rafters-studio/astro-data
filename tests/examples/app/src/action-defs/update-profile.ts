// Action module: validates the input, updates the mock db, returns the new profile.
// Wired into Astro's action system from src/actions/index.ts via wrapAction.

import { z } from "astro/zod";
import type { APIContext } from "astro";

export const actionInput = z.object({
  name: z.string().min(1, "Name is required"),
});

export const accept = "form" as const;

export const revalidates = [["profile"]] as const;

export async function action(input: z.infer<typeof actionInput>, ctx: APIContext) {
  return ctx.locals.db.updateProfile(ctx.locals.currentUserId, { name: input.name });
}
