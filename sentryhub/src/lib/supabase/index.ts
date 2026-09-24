/**
 * Compatibility shim: re-exports request-aware client.
 * Prefer importing from `./request` in new API routes.
 * Existing cookie-only imports of `./server` remain valid.
 */
export { createClient } from "./server";
export { createClientFromRequest } from "./request";
