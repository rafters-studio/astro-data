// Loader module: returns the profile for a given user id.
// Same shape used server-side (runs against the mock db via APIContext.locals)
// and client-side (subscribed via useLoaderData).

import { z } from "astro/zod";
import type { LoaderArgs } from "@rafters/astro-data";

export const loaderInput = z.object({ userId: z.string() });

export const key = ["profile", "current"] as const;

export async function loader({ input, astro }: LoaderArgs<z.infer<typeof loaderInput>>) {
  return astro.locals.db.getProfile(input.userId);
}
