import { createClient } from "@/lib/supabase/server";
import AdminReportList from "@/components/AdminReportList";
import type { Report } from "@/lib/types";

// Access is enforced by admin/layout.tsx (staff only).
export default async function AdminPage() {
  const supabase = createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "*, videos(id, title), comments(id, body, video_id), reporter:profiles!reports_reporter_id_fkey(username, display_name)"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Moderation queue</h1>
      <p className="mb-6 text-neutral-400">
        {reports?.length ?? 0} open report{(reports?.length ?? 0) === 1 ? "" : "s"}.
      </p>
      <AdminReportList initial={(reports as Report[]) ?? []} />
    </div>
  );
}
