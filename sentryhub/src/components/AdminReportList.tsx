"use client";

import { useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { Report } from "@/lib/types";

const REASON_LABELS: Record<string, string> = {
  illegal: "Illegal / dangerous",
  harassment: "Harassment / hate",
  privacy: "Privacy violation",
  spam: "Spam / misleading",
  other: "Other",
};

export default function AdminReportList({ initial }: { initial: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(reportId: string, action: "remove" | "dismiss") {
    setBusyId(reportId);
    const res = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    setBusyId(null);
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (reports.length === 0) {
    return <p className="text-neutral-400">Queue is clear. Nothing to review. 🎉</p>;
  }

  return (
    <ul className="space-y-4">
      {reports.map((r) => {
        const watchUrl =
          r.target_type === "video"
            ? `/watch/${r.video_id}`
            : r.comments?.video_id
            ? `/watch/${r.comments.video_id}`
            : null;
        return (
          <li key={r.id} className="rounded-lg border border-neutral-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                <span className="ml-2 text-xs uppercase tracking-wide text-neutral-500">
                  {r.target_type}
                </span>
                <p className="mt-2 text-sm">
                  {r.target_type === "video" ? (
                    <>Video: <span className="font-medium">{r.videos?.title ?? "(deleted)"}</span></>
                  ) : (
                    <>Comment: <span className="italic text-neutral-300">“{r.comments?.body ?? "(deleted)"}”</span></>
                  )}
                </p>
                {r.details && <p className="mt-1 text-sm text-neutral-400">“{r.details}”</p>}
                <p className="mt-1 text-xs text-neutral-500">
                  by @{r.reporter?.username ?? "unknown"} · {timeAgo(r.created_at)}
                </p>
              </div>
              {watchUrl && (
                <Link
                  href={watchUrl}
                  target="_blank"
                  className="shrink-0 text-sm text-brand hover:underline"
                >
                  View →
                </Link>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(r.id, "remove")}
                disabled={busyId === r.id}
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Remove {r.target_type}
              </button>
              <button
                onClick={() => act(r.id, "dismiss")}
                disabled={busyId === r.id}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
