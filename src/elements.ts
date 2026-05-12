// @rafters/astro-data/elements — Web Components delivery
//
// Reactive controllers that subscribe to loaders and actions and update host
// elements. Consumers attach an instance in connectedCallback and call
// disconnect() in disconnectedCallback.

import type {
  ActionInput,
  ActionModule,
  ActionOutput,
  LoaderModule,
  LoaderOutput,
} from "./index.js";

export class LoaderConsumer<M extends LoaderModule> {
  constructor(
    _host: HTMLElement,
    _module: M,
    _onChange: (data: LoaderOutput<M> | undefined) => void,
  ) {
    throw new Error("not implemented");
  }
  disconnect(): void {
    throw new Error("not implemented");
  }
}

export class ActionConsumer<M extends ActionModule> {
  constructor(_host: HTMLElement, _module: M) {
    throw new Error("not implemented");
  }
  run(_input: ActionInput<M>): Promise<ActionOutput<M>> {
    throw new Error("not implemented");
  }
  get pending(): boolean {
    throw new Error("not implemented");
  }
  get error(): Error | null {
    throw new Error("not implemented");
  }
  get data(): ActionOutput<M> | null {
    throw new Error("not implemented");
  }
}

export class FormConsumer<M extends ActionModule> {
  constructor(_host: HTMLFormElement, _module: M) {
    throw new Error("not implemented");
  }
  disconnect(): void {
    throw new Error("not implemented");
  }
  get pending(): boolean {
    throw new Error("not implemented");
  }
  get errors(): Readonly<Record<string, readonly string[]>> {
    throw new Error("not implemented");
  }
  get data(): ActionOutput<M> | null {
    throw new Error("not implemented");
  }
}
