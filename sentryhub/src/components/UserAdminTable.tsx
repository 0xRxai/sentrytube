"use client";

import { Fragment, useState } from "react";
import type { FeatureFlag, Role } from "@/lib/types";

type U = {
  id: string;
  username: string;
  display_name: string | null;
  role: Role;
  created_at: string;
};
type Ent = { user_id: string; flag_key: string; enabled: boolean };

export default function UserAdminTable({
  currentUserId,
  users,
  flags,
  entitlements,
}: {
  currentUserId: string;
  users: U[];
  flags: FeatureFlag[];
  entitlements: Ent[];
}) {
  const [rows, setRows] = useState(users);
  const [ents, setEnts] = useState(entitlements);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function entFor(userId: string, key: string): boolean | null {
    const e = ents.find((x) => x.user_id === userId && x.flag_key === key);
    return e ? e.enabled : null; // null = inherit role default
  }

  async function setRole(targetUserId: string, role: Role) {
    setBusy(true);
    const res = await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, role }),
    });
    setBusy(false);
    if (res.ok) {
      setRows((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, role } : u)));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed to set role");
    }
  }

  async function cycleEntitlement(userId: string, key: string) {
    // null -> true -> false -> null
    const cur = entFor(userId, key);
    const next = cur === null ? true : cur === true ? false : null;
    setBusy(true);
    await fetch("/api/admin/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, flagKey: key, enabled: next }),
    });
    setBusy(false);
    setEnts((prev) => {
      const without = prev.filter((e) => !(e.user_id === userId && e.flag_key === key));
      return next === null ? without : [...without, { user_id: userId, flag_key: key, enabled: next }];
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-neutral-400">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Role</th>
            <th className="p-3">Features</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <Fragment key={u.id}>
              <tr className="border-t border-neutral-800">
                <td className="p-3">
                  <div className="font-medium">@{u.username}</div>
                  {u.display_name && <div className="text-xs text-neutral-500">{u.display_name}</div>}
                </td>
                <td className="p-3">
                  <select
                    value={u.role}
                    disabled={busy || u.id === currentUserId}
                    onChange={(e) => setRole(u.id, e.target.value as Role)}
                    className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 disabled:opacity-50"
                  >
                    <option value="user">user</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-neutral-500">(you)</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    className="text-brand hover:underline"
                  >
                    {expanded === u.id ? "Hide" : "Manage"}
                  </button>
                </td>
              </tr>
              {expanded === u.id && (
                <tr className="border-t border-neutral-800 bg-neutral-900/40">
                  <td colSpan={3} className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {flags.map((f) => {
                        const state = entFor(u.id, f.key);
                        const label =
                          state === true ? "Granted" : state === false ? "Blocked" : "Default";
                        const color =
                          state === true
                            ? "border-green-600 text-green-300"
                            : state === false
                            ? "border-red-600 text-red-300"
                            : "border-neutral-700 text-neutral-400";
                        return (
                          <button
                            key={f.key}
                            onClick={() => cycleEntitlement(u.id, f.key)}
                            disabled={busy}
                            title={f.description ?? ""}
                            className={`rounded-md border px-3 py-1.5 text-left ${color}`}
                          >
                            <span className="block text-xs">{f.label}</span>
                            <span className="block text-[10px] uppercase tracking-wide">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Click a feature to cycle: Default (role-based) → Granted → Blocked.
                    </p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
