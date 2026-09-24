import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";

const ROLES = ["user", "moderator", "admin"];

// Admin-only: set a user's role. The DB role-escalation guard also enforces this.
export async function POST(request: Request) {
  const { error, supabase, userId } = await requireRole("admin");
  if (error) return NextResponse.json({ error: "Forbidden" }, { status: error });

  const { targetUserId, role } = await request.json();
  if (!targetUserId || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // Don't let an admin accidentally demote themselves and lock the org out.
  if (targetUserId === userId && role !== "admin") {
    return NextResponse.json({ error: "You can't change your own admin role." }, { status: 400 });
  }

  const { error: upErr } = await supabase!
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
