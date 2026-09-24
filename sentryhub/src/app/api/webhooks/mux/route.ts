import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/video";
import { createAdminClient } from "@/lib/supabase/admin";

// Provider webhook. Mux calls this when an asset is created / ready / errored.
// We verify the signature inside the adapter, then update the matching row.
// Setting status='ready' fires the DB trigger that fans out new_video alerts.
export async function POST(request: Request) {
  const raw = await request.text();
  const provider = getVideoProvider();

  let event;
  try {
    event = await provider.parseWebhook(raw, request.headers);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.kind) {
    case "asset_created": {
      // Match by upload_id; record the asset id and mark processing.
      await supabase
        .from("videos")
        .update({ asset_id: event.assetId, status: "processing" })
        .eq("upload_id", event.uploadId);
      break;
    }
    case "ready": {
      const patch = {
        playback_id: event.playbackId,
        duration_seconds: event.durationSeconds,
        status: "ready" as const,
        asset_id: event.assetId ?? null,
      };
      // We always store upload_id at creation, and Mux includes it on the
      // asset.ready event, so match on that; fall back to asset_id.
      if (event.uploadId) {
        await supabase.from("videos").update(patch).eq("upload_id", event.uploadId);
      } else if (event.assetId) {
        await supabase.from("videos").update(patch).eq("asset_id", event.assetId);
      }
      break;
    }
    case "errored": {
      const q = supabase.from("videos").update({ status: "errored" });
      if (event.assetId) await q.eq("asset_id", event.assetId);
      else if (event.uploadId) await q.eq("upload_id", event.uploadId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
