// Mock database. Module-scoped state, mutates in-process.
// Stands in for D1 + Drizzle in the example.

interface Profile {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
}

const profiles = new Map<string, Profile>([
  [
    "user-1",
    {
      id: "user-1",
      name: "Sean Silvius",
      email: "sean@rafters.studio",
      joinedAt: "2026-01-15",
    },
  ],
]);

export const mockDb = {
  getProfile(id: string): Profile {
    const profile = profiles.get(id);
    if (!profile) throw new Error(`profile ${id} not found`);
    return profile;
  },
  updateProfile(id: string, patch: Partial<Profile>): Profile {
    const current = this.getProfile(id);
    const next = { ...current, ...patch };
    profiles.set(id, next);
    return next;
  },
};
