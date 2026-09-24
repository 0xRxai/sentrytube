import { NextResponse } from "next/server";

/**
 * CORS for the shared API that Expo (web + native) and the Next.js site call.
 * Reflects Origin when present so module upgrades (extra clients) stay compatible.
 * Native apps often send no Origin — those requests still succeed without CORS headers.
 */
const ALLOWED_EXTRA = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allow =
    !origin ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    ALLOWED_EXTRA.includes(origin) ||
    origin.endsWith(".expo.dev") ||
    origin.endsWith("sentrytube.com") ||
    origin.endsWith("netlify.app") ||
    origin.endsWith("onrender.com");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && allow) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return headers;
}

export function withCors(request: Request, response: NextResponse): NextResponse {
  const extra = corsHeaders(request);
  for (const [k, v] of Object.entries(extra)) response.headers.set(k, v);
  return response;
}

export function optionsResponse(request: Request): NextResponse {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

/** Mux direct-upload cors_origin: prefer caller Origin, else app URL. */
export function muxCorsOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://sentrytube.com";
}
