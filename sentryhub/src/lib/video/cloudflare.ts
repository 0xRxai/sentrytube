import type { VideoProvider } from "./provider";

// Cloudflare Stream adapter — STUB.
//
// Implementing this file is the *entire* migration if you ever move off Mux:
// the app, routes, DB columns, and components are provider-agnostic. Fill these
// four methods using the Cloudflare Stream API and set VIDEO_PROVIDER=cloudflare.
//
//   createUpload  -> POST /accounts/{id}/stream/direct_upload  (returns uid + uploadURL)
//   parseWebhook  -> verify the `Webhook-Signature` header, map states to events
//   thumbnailUrl  -> https://customer-<code>.cloudflarestream.com/<uid>/thumbnails/thumbnail.jpg
//   deleteAsset   -> DELETE /accounts/{id}/stream/{uid}
//
// (Existing videos would also need re-ingesting on Cloudflare; new uploads just work.)
export const cloudflareProvider: VideoProvider = {
  name: "cloudflare",
  async createUpload() {
    throw new Error("Cloudflare Stream adapter not implemented yet.");
  },
  async parseWebhook() {
    throw new Error("Cloudflare Stream adapter not implemented yet.");
  },
  thumbnailUrl() {
    throw new Error("Cloudflare Stream adapter not implemented yet.");
  },
  async deleteAsset() {
    throw new Error("Cloudflare Stream adapter not implemented yet.");
  },
};
