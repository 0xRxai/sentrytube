"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ad, AdCampaign, AdPlacement } from "@/lib/types";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/ads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function AdManager({
  campaigns,
  ads,
}: {
  campaigns: AdCampaign[];
  ads: Ad[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // New campaign
  const [cName, setCName] = useState("");
  const [cAdv, setCAdv] = useState("");

  // New ad
  const [aCampaign, setACampaign] = useState(campaigns[0]?.id ?? "");
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");
  const [aImg, setAImg] = useState("");
  const [aUrl, setAUrl] = useState("");
  const [aPlacement, setAPlacement] = useState<AdPlacement>("feed");
  const [aWeight, setAWeight] = useState(1);

  async function createCampaign() {
    if (!cName) return;
    setBusy(true);
    await post({ action: "create_campaign", name: cName, advertiser: cAdv });
    setBusy(false);
    setCName("");
    setCAdv("");
    router.refresh();
  }

  async function createAd() {
    if (!aCampaign || !aTitle || !aUrl) return alert("Campaign, title and URL are required.");
    setBusy(true);
    const r = await post({
      action: "create_ad",
      campaignId: aCampaign,
      title: aTitle,
      bodyText: aBody,
      imageUrl: aImg,
      targetUrl: aUrl,
      placement: aPlacement,
      weight: aWeight,
    });
    setBusy(false);
    if (r.error) return alert(r.error);
    setATitle("");
    setABody("");
    setAImg("");
    setAUrl("");
    router.refresh();
  }

  async function toggleAd(adId: string, active: boolean) {
    setBusy(true);
    await post({ action: "toggle_ad", adId, active });
    setBusy(false);
    router.refresh();
  }

  async function setCampaignStatus(campaignId: string, status: string) {
    setBusy(true);
    await post({ action: "set_campaign_status", campaignId, status });
    setBusy(false);
    router.refresh();
  }

  const input =
    "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 p-4">
          <h2 className="mb-3 font-semibold">New campaign</h2>
          <div className="space-y-2">
            <input className={input} placeholder="Campaign name" value={cName} onChange={(e) => setCName(e.target.value)} />
            <input className={input} placeholder="Advertiser (optional)" value={cAdv} onChange={(e) => setCAdv(e.target.value)} />
            <button onClick={createCampaign} disabled={busy} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              Create campaign
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 p-4">
          <h2 className="mb-3 font-semibold">New ad</h2>
          <div className="space-y-2">
            <select className={input} value={aCampaign} onChange={(e) => setACampaign(e.target.value)}>
              <option value="">Select campaign…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input className={input} placeholder="Title" value={aTitle} onChange={(e) => setATitle(e.target.value)} />
            <input className={input} placeholder="Body (optional)" value={aBody} onChange={(e) => setABody(e.target.value)} />
            <input className={input} placeholder="Image URL (optional)" value={aImg} onChange={(e) => setAImg(e.target.value)} />
            <input className={input} placeholder="Target URL (https://…)" value={aUrl} onChange={(e) => setAUrl(e.target.value)} />
            <div className="flex gap-2">
              <select className={input} value={aPlacement} onChange={(e) => setAPlacement(e.target.value as AdPlacement)}>
                <option value="feed">feed</option>
                <option value="sidebar">sidebar</option>
                <option value="preroll">preroll</option>
              </select>
              <input className={input} type="number" min={1} value={aWeight} onChange={(e) => setAWeight(Number(e.target.value))} title="Weight" />
            </div>
            <button onClick={createAd} disabled={busy} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              Create ad
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-neutral-400">No campaigns yet.</p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-neutral-800 p-3">
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.advertiser && <span className="ml-2 text-sm text-neutral-500">{c.advertiser}</span>}
                </div>
                <select
                  value={c.status}
                  onChange={(e) => setCampaignStatus(c.id, e.target.value)}
                  disabled={busy}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Ads</h2>
        {ads.length === 0 ? (
          <p className="text-neutral-400">No ads yet.</p>
        ) : (
          <ul className="space-y-2">
            {ads.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-neutral-800 p-3">
                <div>
                  <span className="font-medium">{a.title}</span>
                  <span className="ml-2 rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">{a.placement}</span>
                  <span className="ml-2 text-xs text-neutral-500">weight {a.weight}</span>
                </div>
                <button
                  onClick={() => toggleAd(a.id, !a.active)}
                  disabled={busy}
                  className={
                    "rounded-md px-3 py-1 text-sm " +
                    (a.active ? "bg-green-600/20 text-green-300" : "bg-neutral-800 text-neutral-400")
                  }
                >
                  {a.active ? "Active" : "Paused"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
