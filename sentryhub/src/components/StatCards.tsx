// Small reusable metric grid used across dashboards.
export default function StatCards({
  stats,
}: {
  stats: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-bold">{s.value}</p>
          <p className="text-sm text-neutral-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
