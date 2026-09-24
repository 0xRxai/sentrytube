"use client";

import Link from "next/link";
import type { CategoryWithTags } from "@/lib/types";

// Renders tag chips grouped by category; clicking filters the feed by tag slug.
export default function TagFilter({
  categories,
  active,
}: {
  categories: CategoryWithTags[];
  active: string | null;
}) {
  return (
    <div className="mt-4 space-y-3">
      {categories.map((cat) => (
        <div key={cat.id} className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-neutral-500">
            {cat.label}
          </span>
          {cat.tags.map((t) => {
            const on = active === t.slug;
            return (
              <Link
                key={t.id}
                href={on ? "/" : `/?tag=${t.slug}`}
                className={
                  "rounded-full border px-3 py-1 text-sm transition " +
                  (on
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
