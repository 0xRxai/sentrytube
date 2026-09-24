"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";
import type { AdPlacement } from "@/lib/types";

type ServedAd = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  target_url: string;
};

// Fetches one house ad for a placement, logs an impression when shown, and a
// click when followed. Renders nothing if no ad is available (or user is ad-free).
export default function AdSlot({
  placement,
  tag,
}: {
  placement: AdPlacement;
  tag?: string;
}) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const logged = useRef(false);

  useEffect(() => {
    const url = `/api/ads?placement=${placement}${tag ? `&tag=${tag}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setAd(d.ad ?? null))
      .catch(() => setAd(null));
  }, [placement, tag]);

  useEffect(() => {
    if (ad && !logged.current) {
      logged.current = true;
      track({ type: "ad_impression", adId: ad.id });
    }
  }, [ad]);

  if (!ad) return null;

  return (
    <a
      href={ad.target_url}
      target="_blank"
      rel="noopener nofollow sponsored"
      onClick={() => track({ type: "ad_click", adId: ad.id })}
      className="block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-neutral-700"
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Sponsored</span>
      </div>
      {ad.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt={ad.title} className="mt-1 aspect-video w-full object-cover" />
      )}
      <div className="p-3">
        <p className="font-medium leading-snug">{ad.title}</p>
        {ad.body && <p className="mt-0.5 text-sm text-neutral-400">{ad.body}</p>}
      </div>
    </a>
  );
}
