"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as UpChunk from "@mux/upchunk";
import { createClient } from "@/lib/supabase/client";
import type { CategoryWithTags } from "@/lib/types";

export default function UploadForm({ categories }: { categories: CategoryWithTags[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [pct, setPct] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Pick a video file first.");
    setBusy(true);

    try {
      // 1. Ask our backend for a resumable upload URL (also creates the row + tags).
      setStatus("Preparing upload…");
      const res = await fetch("/api/upload/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          eventDate,
          tagIds: [...selectedTags],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start upload");
      const { videoId, uploadUrl } = data as { videoId: string; uploadUrl: string };

      // 2. Upload the file directly to the provider (resumable, chunked).
      setStatus("Uploading…");
      const upload = UpChunk.createUpload({ endpoint: uploadUrl, file, chunkSize: 30720 });

      upload.on("progress", (p: any) => setPct(Math.round(p.detail)));

      await new Promise<void>((resolve, reject) => {
        upload.on("success", () => resolve());
        upload.on("error", (e: any) => reject(new Error(e.detail?.message ?? "Upload failed")));
      });

      // 3. Mark as processing; the provider webhook will flip it to "ready".
      setPct(100);
      setStatus("Processing video…");
      await supabase.from("videos").update({ status: "processing" }).eq("id", videoId);

      router.push(`/watch/${videoId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
      setStatus(null);
      setPct(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Video file</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-white"
        />
        <p className="mt-1 text-xs text-neutral-500">
          MP4 / MOV from your Tesla USB. Large files upload in resumable chunks.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <input
            placeholder="e.g. Costco lot, Austin TX"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Event date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Tags</label>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.tags.map((t) => {
                  const on = selectedTags.has(t.id);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={
                        "rounded-full border px-3 py-1 text-sm transition " +
                        (on
                          ? "border-brand bg-brand text-white"
                          : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pct !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? status ?? "Working…" : "Publish"}
      </button>
    </form>
  );
}
