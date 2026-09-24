// Provider-agnostic video interface.
// The rest of the app only ever imports `getVideoProvider()` and these types,
// so switching from Mux to Cloudflare Stream later means writing one new adapter
// — no changes to routes, components, or the database shape.

export type CreateUploadResult = {
  // ID of the direct-upload session (stored on the video row as upload_id).
  uploadId: string;
  // URL the browser PUTs the file to (resumable).
  uploadUrl: string;
};

// Normalised webhook event the app cares about.
export type VideoEvent =
  | { kind: "asset_created"; uploadId: string; assetId: string }
  | {
      kind: "ready";
      assetId: string;
      uploadId?: string;
      playbackId: string;
      durationSeconds: number | null;
    }
  | { kind: "errored"; assetId?: string; uploadId?: string }
  | { kind: "ignored" };

export interface VideoProvider {
  readonly name: string;

  // Create a resumable direct-upload session for the browser.
  createUpload(opts: { corsOrigin: string; passthrough?: string }): Promise<CreateUploadResult>;

  // Verify a raw webhook request and return a normalised event.
  // Throws if the signature is invalid.
  parseWebhook(rawBody: string, headers: Headers): Promise<VideoEvent>;

  // Build a thumbnail image URL from a playback id.
  thumbnailUrl(playbackId: string, opts?: { time?: number }): string;

  // Delete an asset (used when a user deletes their video).
  deleteAsset(assetId: string): Promise<void>;
}
