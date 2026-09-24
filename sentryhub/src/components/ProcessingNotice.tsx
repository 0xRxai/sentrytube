"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls for the video becoming ready by refreshing the server component every
// few seconds. Stops automatically when the page re-renders as "ready".
export default function ProcessingNotice() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-neutral-800">
      <div className="h-full w-1/3 animate-pulse bg-brand" />
    </div>
  );
}
