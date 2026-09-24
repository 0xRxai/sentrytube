"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import ReportButton from "./ReportButton";
import type { Comment } from "@/lib/types";

export default function Comments({
  videoId,
  initialComments,
  currentUserId,
}: {
  videoId: string;
  initialComments: Comment[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return router.push("/login");
    const text = body.trim();
    if (!text) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({ video_id: videoId, author_id: currentUserId, body: text })
      .select("*, profiles(username, display_name, avatar_url)")
      .single();

    setBusy(false);
    if (!error && data) {
      setComments((prev) => [data as Comment, ...prev]);
      setBody("");
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (!error) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">{comments.length} comments</h2>

      <form onSubmit={submit} className="mb-6 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={currentUserId ? "Add a comment…" : "Log in to comment"}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Post
        </button>
      </form>

      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-bold">
              {(c.profiles?.display_name ?? c.profiles?.username ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">
                  @{c.profiles?.username ?? "unknown"}
                </span>{" "}
                <span className="text-neutral-500">{timeAgo(c.created_at)}</span>
              </p>
              <p className="text-sm text-neutral-200">{c.body}</p>
            </div>
            {currentUserId === c.author_id ? (
              <button
                onClick={() => remove(c.id)}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                delete
              </button>
            ) : (
              <ReportButton
                targetType="comment"
                commentId={c.id}
                signedIn={!!currentUserId}
                size="sm"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
