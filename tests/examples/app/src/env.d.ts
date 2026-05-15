/// <reference path="../.astro/types.d.ts" />

interface Profile {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
}

interface MockDb {
  getProfile(id: string): Profile;
  updateProfile(id: string, patch: Partial<Profile>): Profile;
}

declare namespace App {
  interface Locals {
    db: MockDb;
    currentUserId: string;
  }
}
