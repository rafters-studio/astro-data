// @rafters/astro-data/react — React delivery
//
// Hooks consume the core primitives via useSyncExternalStore. The <Form>
// component and useForm hook are bare-bones; kelex generates richer forms
// from action input schemas if you want polish.

import type { ReactNode, JSX } from "react";
import type {
  ActionInput,
  ActionModule,
  ActionOutput,
  ActionState,
  LoaderModule,
  LoaderOutput,
  Navigation,
} from "./index.js";

export function useLoaderData<M extends LoaderModule>(
  _module: M,
  _initial?: LoaderOutput<M>,
): LoaderOutput<M> {
  throw new Error("not implemented");
}

export interface UseActionResult<M extends ActionModule> extends ActionState<M> {
  run: (input: ActionInput<M>) => Promise<ActionOutput<M>>;
}

export function useAction<M extends ActionModule>(_module: M): UseActionResult<M> {
  throw new Error("not implemented");
}

export function useNavigation(): Navigation {
  throw new Error("not implemented");
}

export interface UseFormResult<M extends ActionModule> {
  pending: boolean;
  errors: Partial<Record<keyof ActionInput<M>, readonly string[]>>;
  data: ActionOutput<M> | null;
  reset: () => void;
}

export function useForm<M extends ActionModule>(_module: M): UseFormResult<M> {
  throw new Error("not implemented");
}

export interface FormProps<M extends ActionModule> {
  module: M;
  children: ReactNode;
  onSuccess?: (data: ActionOutput<M>) => void;
  onError?: (error: unknown) => void;
  className?: string;
}

export function Form<M extends ActionModule>(_props: FormProps<M>): JSX.Element {
  throw new Error("not implemented");
}
