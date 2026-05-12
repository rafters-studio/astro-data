import { defineMiddleware } from "astro:middleware";
import { mockDb } from "./lib/mock-db.js";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.db = mockDb;
  context.locals.currentUserId = "user-1";
  return next();
});
