import Mux from "@mux/mux-node";
import type { VideoProvider, CreateUploadResult, VideoEvent } from "./provider";

// Mux adapter. All Mux-specific logic lives here.
let _mux: Mux | null = null;
function mux(): Mux {
  if (!_mux) {
    _mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    });
  }
  return _mux;
}

export const muxProvider: VideoProvider = {
  name: "mux",

  async createUpload({ corsOrigin, passthrough }): Promise<CreateUploadResult> {
    const upload = await mux().video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ["public"],
        // "baseline" is the cheapest encode tier; bump to "smart"/"plus" later.
        encoding_tier: "baseline",
        passthrough, // round-tripped back on webhooks so we can match our row
      },
    });
    return { uploadId: upload.id, uploadUrl: upload.url };
  },

  async parseWebhook(rawBody, headers): Promise<VideoEvent> {
    // Throws if the signature header doesn't match MUX_WEBHOOK_SECRET.
    const event = mux().webhooks.unwrap(
      rawBody,
      Object.fromEntries(headers.entries()),
      process.env.MUX_WEBHOOK_SECRET!
    ) as { type: string; data: Record<string, any> };

    switch (event.type) {
      case "video.upload.asset_created":
        return {
          kind: "asset_created",
          uploadId: event.data.id,
          assetId: event.data.asset_id,
        };
      case "video.asset.ready": {
        const playback = event.data.playback_ids?.[0]?.id;
        return {
          kind: "ready",
          assetId: event.data.id,
          uploadId: event.data.upload_id,
          playbackId: playback,
          durationSeconds: event.data.duration
            ? Math.round(event.data.duration)
            : null,
        };
      }
      case "video.asset.errored":
        return { kind: "errored", assetId: event.data.id, uploadId: event.data.upload_id };
      default:
        return { kind: "ignored" };
    }
  },

  thumbnailUrl(playbackId, opts) {
    const t = opts?.time ?? 1;
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${t}&width=640`;
  },

  async deleteAsset(assetId) {
    await mux().video.assets.delete(assetId);
  },
};
