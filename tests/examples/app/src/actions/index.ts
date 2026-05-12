import { defineAction } from "astro:actions";
import { wrapAction } from "@rafters/astro-data/astro";
import * as updateProfile from "../action-defs/update-profile.js";

export const server = {
  updateProfile: wrapAction(defineAction, updateProfile),
};
