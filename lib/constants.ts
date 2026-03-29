/**
 * Centralized route configuration.
 * Update these lists instead of hardcoding paths in middleware.ts.
 */

/** Routes accessible without being logged in. */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/test",
  "/test-login",
  "/debug",
  "/check-setup",
];

/** Prefix paths that require admin role. */
export const ADMIN_ROUTES = ["/users"];
