import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";

// Admin-only: grant/block/clear a per-user feature entitlement.
// enabled: true = grant, false = block, null = remove override (use role default).
export async function POST(request: Request) {
  const { error, supabase } = await requireRole("admin");
  if (error) return NextResponse.json({ error: "Forbidden" }, { status: error });

  const { targetUserId, flagKey, enabled } = await request.json();
  if (!targetUserId || !flagKey) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (enabled === null) {
    await supabase!
      .from("user_entitlements")
      .delete()
      .eq("user_id", targetUserId)
      .eq("flag_key", flagKey);
  } else {
    await supabase!
      .from("user_entitlements")
      .upsert(
        { user_id: targetUserId, flag_key: flagKey, enabled: !!enabled },
        { onConflict: "user_id,flag_key" }
      );
  }

  return NextResponse.json({ ok: true });
}
