"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    value.trim() ? sp.set("q", value.trim()) : sp.delete("q");
    router.push(`/?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by title, description, or location…"
        className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 outline-none focus:border-brand"
      />
      <button
        type="submit"
        className="rounded-md border border-neutral-700 px-4 py-2 hover:border-neutral-500"
      >
        Search
      </button>
    </form>
  );
}
