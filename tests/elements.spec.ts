// Web Components controllers (browser mode — needs real DOM, custom events,
// and FormData). Covers LoaderConsumer subscription + event dispatch,
// ActionConsumer run/revalidate/state, and FormConsumer submit interception.

import { describe, it, expect, beforeEach } from "vitest";
import {
  ACTION_EVENT,
  ActionConsumer,
  FormConsumer,
  LOADER_EVENT,
  LoaderConsumer,
} from "../src/elements.js";
import {
  configure,
  getLoaderData,
  setLoaderData,
  z,
  type ActionModule,
  type AstroActionFn,
  type LoaderArgs,
  type LoaderModule,
} from "../src/index.js";
import { createMemoryCache } from "../src/internal/cache-memory.js";

const Profile = {
  key: ["profile"] as const,
  async loader(_args: LoaderArgs<undefined>) {
    return { name: "seed" };
  },
} satisfies LoaderModule<undefined, { name: string }>;

const UpdateProfile = {
  actionInput: z.object({ name: z.string() }),
  revalidates: [["profile"]] as const,
  async action(input: { name: string }) {
    return { saved: input.name };
  },
} satisfies ActionModule<{ name: string }, { saved: string }>;

const okAction: AstroActionFn<{ name: string }, { saved: string }> = async (input) => ({
  data: { saved: input.name },
});
const errAction: AstroActionFn<{ name: string }, { saved: string }> = async () => ({
  error: new Error("boom"),
});

beforeEach(() => {
  configure({ cache: createMemoryCache() });
});

describe("LoaderConsumer", () => {
  it("emits the current value immediately and on cache writes", () => {
    const host = document.createElement("div");
    const calls: Array<{ name: string } | undefined> = [];
    const events: Array<{ name: string } | undefined> = [];
    host.addEventListener(LOADER_EVENT, (e) => events.push((e as CustomEvent).detail));

    const consumer = new LoaderConsumer(host, Profile, (data) => calls.push(data), {
      initial: { name: "ssr" },
    });

    expect(calls).toEqual([{ name: "ssr" }]);
    expect(consumer.data).toEqual({ name: "ssr" });

    setLoaderData(Profile, { name: "live" });
    expect(calls).toEqual([{ name: "ssr" }, { name: "live" }]);
    expect(events.at(-1)).toEqual({ name: "live" });

    consumer.disconnect();
    setLoaderData(Profile, { name: "after" });
    expect(calls).toEqual([{ name: "ssr" }, { name: "live" }]);
  });
});

describe("ActionConsumer", () => {
  it("runs, exposes data, and revalidates on success", async () => {
    setLoaderData(Profile, { name: "stale" });
    const host = document.createElement("div");
    const states: boolean[] = [];
    host.addEventListener(ACTION_EVENT, (e) => states.push((e as CustomEvent).detail.pending));

    const consumer = new ActionConsumer(host, okAction, UpdateProfile);

    const result = await consumer.run({ name: "Ada" });

    expect(result.data).toEqual({ saved: "Ada" });
    expect(consumer.data).toEqual({ saved: "Ada" });
    expect(consumer.pending).toBe(false);
    expect(states).toEqual([true, false]); // pending toggled on then off
    expect(getLoaderData(Profile)).toBeUndefined(); // revalidated away
  });

  it("captures errors without throwing", async () => {
    const host = document.createElement("div");
    const consumer = new ActionConsumer(host, errAction, UpdateProfile);

    const result = await consumer.run({ name: "x" });
    expect(result.error).toBeInstanceOf(Error);
    expect(consumer.error).toBeInstanceOf(Error);
    expect(getLoaderData(Profile)).toBeUndefined(); // never set, never revalidated
  });
});

describe("FormConsumer", () => {
  it("intercepts submit, serializes FormData, runs the action", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "name";
    input.value = "Ada";
    form.appendChild(input);
    document.body.appendChild(form);

    let received: { name: string } | undefined;
    const astroAction: AstroActionFn<{ name: string }, { saved: string }> = async (payload) => {
      received = payload;
      return { data: { saved: payload.name } };
    };

    let resolveDone: () => void;
    const done = new Promise<void>((r) => {
      resolveDone = r;
    });
    let success: { saved: string } | undefined;
    const consumer = new FormConsumer(form, astroAction, UpdateProfile, {
      onSuccess: (data) => {
        success = data;
        resolveDone();
      },
    });

    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true, bubbles: true }));
    await done;

    expect(received).toEqual({ name: "Ada" });
    expect(success).toEqual({ saved: "Ada" });
    expect(consumer.data).toEqual({ saved: "Ada" });

    consumer.disconnect();
    form.remove();
  });
});
