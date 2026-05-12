// @rafters/astro-data/react — React delivery
//
// Hooks subscribe to the cache via useSyncExternalStore. useAction wraps an
// Astro action handle and invalidates the module's revalidates keys after
// success.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { JSX, ReactNode } from "react";
import {
  type ActionInput,
  type ActionModule,
  type ActionOutput,
  type LoaderModule,
  type LoaderOutput,
  getLoaderData,
  invalidate,
  setLoaderData,
  subscribeLoader,
} from "./index.js";

/**
 * Subscribe to a loader's cached value. On first mount, the provided initial
 * value is written to the cache so other islands subscribing to the same
 * loader key see consistent state.
 */
export function useLoaderData<M extends LoaderModule>(
  module: M,
  initial?: LoaderOutput<M>,
): LoaderOutput<M> {
  const hydratedRef = useRef(false);
  if (!hydratedRef.current && initial !== undefined) {
    setLoaderData(module, initial);
    hydratedRef.current = true;
  }

  const subscribe = useCallback(
    (listener: () => void) => subscribeLoader(module, listener),
    [module],
  );
  const getSnapshot = useCallback(() => getLoaderData(module) ?? initial, [module, initial]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (value === undefined) {
    throw new Error(
      `@rafters/astro-data/react: useLoaderData called for ${JSON.stringify(
        module.key,
      )} with no cached value and no initial`,
    );
  }
  return value as LoaderOutput<M>;
}

/** Shape mirroring what `astro:actions`' generated action handles return. */
export type AstroActionResult<O> = { data?: O; error?: unknown };
export type AstroActionFn<I, O> = (input: I) => Promise<AstroActionResult<O>>;

export interface UseActionResult<M extends ActionModule> {
  run: (input: ActionInput<M>) => Promise<AstroActionResult<ActionOutput<M>>>;
  pending: boolean;
  error: unknown;
  data: ActionOutput<M> | null;
  reset: () => void;
}

/**
 * Wrap an Astro action handle with revalidation. Pass the action handle
 * imported from `astro:actions` and the corresponding action module — the
 * module's `revalidates` keys are invalidated on success.
 */
export function useAction<M extends ActionModule>(
  astroAction: AstroActionFn<ActionInput<M>, ActionOutput<M>>,
  module: M,
): UseActionResult<M> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [data, setData] = useState<ActionOutput<M> | null>(null);

  const run = useCallback(
    async (input: ActionInput<M>): Promise<AstroActionResult<ActionOutput<M>>> => {
      setPending(true);
      setError(null);
      try {
        const result = await astroAction(input);
        if (result.error) {
          setError(result.error);
        } else if (result.data !== undefined) {
          setData(result.data);
          if (module.revalidates) {
            for (const key of module.revalidates) invalidate(key);
          }
        }
        return result;
      } catch (e) {
        setError(e);
        return { error: e };
      } finally {
        setPending(false);
      }
    },
    [astroAction, module],
  );

  const reset = useCallback(() => {
    setPending(false);
    setError(null);
    setData(null);
  }, []);

  return { run, pending, error, data, reset };
}

export interface FormProps<M extends ActionModule> {
  astroAction: AstroActionFn<ActionInput<M>, ActionOutput<M>>;
  module: M;
  children: ReactNode;
  onSuccess?: (data: ActionOutput<M>) => void;
  onError?: (error: unknown) => void;
  className?: string;
}

/**
 * Bare-bones form wrapper. Intercepts submit, builds FormData -> object,
 * calls the action through useAction (which handles revalidation), and
 * fires onSuccess / onError. Consumers write their own <input> elements.
 *
 * Compose with kelex to generate the inputs from the action's Zod schema.
 */
export function Form<M extends ActionModule>(props: FormProps<M>): JSX.Element {
  const { astroAction, module, children, onSuccess, onError, className } = props;
  const action = useAction(astroAction, module);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries()) as ActionInput<M>;
      const result = await action.run(payload);
      if (result.error) onError?.(result.error);
      else if (result.data !== undefined) onSuccess?.(result.data);
    },
    [action, onSuccess, onError],
  );

  // Hint for kelex / consumers wiring per-field state via context (v0.2).
  useEffect(() => {
    // Reserved for future field-error context provider.
  }, []);

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
