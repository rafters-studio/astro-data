import { useState } from "react";
import { setLoaderData } from "@rafters/astro-data";
import { useAction, useLoaderData } from "@rafters/astro-data/react";
import { actions } from "astro:actions";
import * as ProfileLoader from "../loaders/profile.js";
import * as UpdateProfileAction from "../action-defs/update-profile.js";

type Props = {
  initialData: Awaited<ReturnType<typeof ProfileLoader.loader>>;
};

export default function Dashboard({ initialData }: Props) {
  const profile = useLoaderData(ProfileLoader, initialData);
  const update = useAction(actions.updateProfile, UpdateProfileAction);
  const [draft, setDraft] = useState(profile.name);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", draft);
    const result = await update.run(formData as unknown as { name: string });
    if (result.data) {
      // Bridge: action's return value populates the loader's cache key.
      // v0.2 will surface this as a declarative `refreshes:` export.
      setLoaderData(ProfileLoader, result.data);
    }
  }

  return (
    <section>
      <h2>Profile</h2>
      <dl>
        <dt>Name</dt>
        <dd data-testid="profile-name">{profile.name}</dd>
        <dt>Email</dt>
        <dd>{profile.email}</dd>
        <dt>Joined</dt>
        <dd>{profile.joinedAt}</dd>
      </dl>

      <form onSubmit={onSubmit}>
        <label>
          Name
          <input
            name="name"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            required
          />
        </label>
        <button type="submit" disabled={update.pending}>
          {update.pending ? "Saving..." : "Save"}
        </button>
      </form>

      {update.error ? <p role="alert">Update failed.</p> : null}
    </section>
  );
}
