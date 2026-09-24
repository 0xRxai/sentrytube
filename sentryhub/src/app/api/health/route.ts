import { NextResponse } from "next/server";
import { withCors, optionsResponse } from "@/lib/api/cors";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

/** Lightweight health check for deploys / uptime monitors. No secrets. */
export async function GET(request: Request) {
  return withCors(
    request,
    NextResponse.json({
      ok: true,
      service: "sentryhub-api",
      provider: process.env.VIDEO_PROVIDER ?? "mux",
      time: new Date().toISOString(),
    })
  );
}
