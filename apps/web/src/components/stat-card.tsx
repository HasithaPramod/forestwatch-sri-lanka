'use client';

import type { NamedCount } from '@forestwatch/types';
import { maxTrees } from '@/lib/dashboards';

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-forest-900/10 bg-white/70 p-4">
      <p className="break-words text-xs uppercase tracking-wider text-forest-700">{label}</p>
      <p className="mt-2 break-words font-display text-3xl text-forest-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-ink/55">{hint}</p> : null}
    </div>
  );
}

export function BarList({ title, rows, empty }: { title: string; rows: NamedCount[]; empty: string }) {
  const max = maxTrees(rows) || 1;
  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
      <h2 className="font-display text-xl text-forest-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink/80">{row.label}</span>
                <span className="text-forest-800">{row.trees.toLocaleString('en-LK')}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-forest-700" style={{ width: `${Math.round((row.trees / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
