"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS: { value: string; label: string }[] = [
  { value: "illegal", label: "Illegal / dangerous content" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "privacy", label: "Privacy violation (e.g. plates, faces, doxxing)" },
  { value: "spam", label: "Spam or misleading" },
  { value: "other", label: "Something else" },
];

export default function ReportButton({
  targetType,
  videoId,
  commentId,
  signedIn,
  size = "md",
}: {
  targetType: "video" | "comment";
  videoId?: string;
  commentId?: string;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("illegal");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!signedIn) return router.push("/login");
    setBusy(true);
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, videoId, commentId, reason, details }),
    });
    setBusy(false);
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setDetails("");
    }, 1500);
  }

  const trigger =
    size === "sm" ? (
      <button onClick={() => setOpen(true)} className="text-xs text-neutral-500 hover:text-red-400">
        report
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500"
      >
        Report
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <p className="py-6 text-center text-green-400">
                Thanks — our moderators will review this.
              </p>
            ) : (
              <>
                <h3 className="mb-1 text-lg font-semibold">
                  Report this {targetType}
                </h3>
                <p className="mb-4 text-sm text-neutral-400">
                  Tell us what&apos;s wrong. Reports are reviewed by moderators.
                </p>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Optional details…"
                  className="mt-3 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
