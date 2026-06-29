// @rafters/astro-data/elements — Web Components delivery
//
// Framework-agnostic controllers for custom elements. Construct one in
// `connectedCallback`, call `disconnect()` in `disconnectedCallback`. Each
// controller both invokes a callback and dispatches a DOM event on its host,
// so a custom element can re-render via whichever it prefers.
//
//   astro-data:loader  detail: LoaderOutput | undefined
//   astro-data:action  detail: { pending, error, data }

import { getLoaderData, setLoaderData, subscribeLoader } from "./index.js";
import type {
  ActionInput,
  ActionModule,
  ActionOutput,
  AstroActionFn,
  AstroActionResult,
  LoaderInput,
  LoaderModule,
  LoaderOutput,
} from "./index.js";
import { runActionAndRevalidate } from "./internal/run-action.js";

export const LOADER_EVENT = "astro-data:loader";
export const ACTION_EVENT = "astro-data:action";

export interface LoaderConsumerOptions<M extends LoaderModule> {
  /** Input for a dynamic-key loader. Omit for static-key loaders. */
  input?: LoaderInput<M>;
  /** SSR value to seed the cache on construction (e.g. data serialized into the page). */
  initial?: LoaderOutput<M>;
}

/**
 * Subscribe a host element to a loader's cached value. Fires `onChange` and
 * dispatches a `LOADER_EVENT` on the host on every cache write or invalidation,
 * and once immediately with the current value.
 */
export class LoaderConsumer<M extends LoaderModule> {
  readonly #host: HTMLElement;
  readonly #module: M;
  readonly #input: LoaderInput<M> | undefined;
  readonly #unsubscribe: () => void;
  #data: LoaderOutput<M> | undefined;

  constructor(
    host: HTMLElement,
    module: M,
    onChange: (data: LoaderOutput<M> | undefined) => void,
    options: LoaderConsumerOptions<M> = {},
  ) {
    this.#host = host;
    this.#module = module;
    this.#input = options.input;

    if (options.initial !== undefined) {
      if (this.#input === undefined) setLoaderData(module, options.initial);
      else setLoaderData(module, this.#input, options.initial);
    }

    const emit = (): void => {
      this.#data = this.#read();
      onChange(this.#data);
      this.#host.dispatchEvent(new CustomEvent(LOADER_EVENT, { detail: this.#data }));
    };

    this.#unsubscribe =
      this.#input === undefined
        ? subscribeLoader(module, () => emit())
        : subscribeLoader(module, this.#input, () => emit());

    emit();
  }

  #read(): LoaderOutput<M> | undefined {
    return this.#input === undefined
      ? getLoaderData(this.#module)
      : getLoaderData(this.#module, this.#input);
  }

  /** Current cached value. */
  get data(): LoaderOutput<M> | undefined {
    return this.#data;
  }

  /** Detach the cache subscription. */
  disconnect(): void {
    this.#unsubscribe();
  }
}

/**
 * Run an action from a host element. `run` executes the action, revalidates
 * the module's keys on success, and dispatches an `ACTION_EVENT` carrying the
 * latest `{ pending, error, data }` so the host can re-render.
 */
export class ActionConsumer<M extends ActionModule> {
  readonly #host: HTMLElement;
  readonly #astroAction: AstroActionFn<ActionInput<M>, ActionOutput<M>>;
  readonly #module: M;
  #pending = false;
  #error: unknown = null;
  #data: ActionOutput<M> | null = null;

  constructor(
    host: HTMLElement,
    astroAction: AstroActionFn<ActionInput<M>, ActionOutput<M>>,
    module: M,
  ) {
    this.#host = host;
    this.#astroAction = astroAction;
    this.#module = module;
  }

  async run(input: ActionInput<M>): Promise<AstroActionResult<ActionOutput<M>>> {
    this.#pending = true;
    this.#error = null;
    this.#emit();
    const result = await runActionAndRevalidate(this.#astroAction, this.#module, input);
    if (result.error) this.#error = result.error;
    else if (result.data !== undefined) this.#data = result.data;
    this.#pending = false;
    this.#emit();
    return result;
  }

  get pending(): boolean {
    return this.#pending;
  }

  get error(): unknown {
    return this.#error;
  }

  get data(): ActionOutput<M> | null {
    return this.#data;
  }

  #emit(): void {
    this.#host.dispatchEvent(
      new CustomEvent(ACTION_EVENT, {
        detail: { pending: this.#pending, error: this.#error, data: this.#data },
      }),
    );
  }
}

export interface FormConsumerOptions<M extends ActionModule> {
  onSuccess?: (data: ActionOutput<M>) => void;
  onError?: (error: unknown) => void;
}

/**
 * Bind a `<form>` to an action. Intercepts submit, serializes FormData to an
 * object, runs the action (with revalidation), and fires `onSuccess`/`onError`.
 * State mirrors the underlying ActionConsumer.
 */
export class FormConsumer<M extends ActionModule> {
  readonly #host: HTMLFormElement;
  readonly #action: ActionConsumer<M>;
  readonly #options: FormConsumerOptions<M>;
  readonly #handler: (event: SubmitEvent) => void;

  constructor(
    host: HTMLFormElement,
    astroAction: AstroActionFn<ActionInput<M>, ActionOutput<M>>,
    module: M,
    options: FormConsumerOptions<M> = {},
  ) {
    this.#host = host;
    this.#options = options;
    this.#action = new ActionConsumer(host, astroAction, module);
    this.#handler = (event) => {
      void this.#onSubmit(event);
    };
    host.addEventListener("submit", this.#handler);
  }

  async #onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(this.#host).entries()) as ActionInput<M>;
    const result = await this.#action.run(payload);
    if (result.error) this.#options.onError?.(result.error);
    else if (result.data !== undefined) this.#options.onSuccess?.(result.data);
  }

  get pending(): boolean {
    return this.#action.pending;
  }

  get error(): unknown {
    return this.#action.error;
  }

  get data(): ActionOutput<M> | null {
    return this.#action.data;
  }

  /** Remove the submit listener. */
  disconnect(): void {
    this.#host.removeEventListener("submit", this.#handler);
  }
}
