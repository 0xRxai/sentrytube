import { NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/request";
import { optionsResponse, withCors } from "@/lib/api/cors";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  const supabase = createClientFromRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return withCors(request, NextResponse.json({ error: "Not authenticated" }, { status: 401 }));
  }

  const { endpoint, p256dh, auth } = await request.json();
  if (!endpoint || !p256dh || !auth) {
    return withCors(request, NextResponse.json({ error: "Invalid subscription" }, { status: 400 }));
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }));
  }
  return withCors(request, NextResponse.json({ ok: true }));
}
