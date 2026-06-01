import { useMemo, useState } from 'react';
import { api } from '../lib/api.ts';
import { useAsync } from '../lib/useAsync.ts';
import { PRICE, SPECIES_LABEL } from '../lib/carbon.ts';
import type { CreditStatus, LedgerEntry } from '../lib/types.ts';
import { dateLabel, money, tonnes } from '../lib/format.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { CreditChip } from '../components/CreditChip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Alert } from '../components/Alert.tsx';
import { SkeletonRow } from '../components/Skeleton.tsx';
import { Icon } from '../components/icons.tsx';

const FILTERS: { value: CreditStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' },
  { value: 'retired', label: 'Retired' },
  { value: 'reversed', label: 'Reversed' },
];

export function Ledger() {
  const { data, error, loading, reload } = useAsync<LedgerEntry[]>(() => api.ledger());
  const [filter, setFilter] = useState<CreditStatus | 'all'>('all');

  const all = data ?? [];
  const rows = useMemo(
    () => (filter === 'all' ? all : all.filter((c) => c.status === filter)),
    [all, filter],
  );

  return (
    <div>
      <PageHeader
        title="Credit ledger"
        subtitle="Every credit ever issued and its current state. The ledger is append-only — retired credits are frozen forever."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-700 px-3 py-1.5 text-sm text-muted">
            <Icon.Ledger width={15} height={15} className="text-primary" />
            {loading ? '—' : `${all.length} credit${all.length === 1 ? '' : 's'}`}
          </span>
        }
      />

      {error && (
        <div className="mb-5">
          <Alert tone="error">
            {error}{' '}
            <button onClick={reload} className="font-medium text-primary hover:underline cursor-pointer">
              Retry
            </button>
          </Alert>
        </div>
      )}

      {!loading && all.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = f.value === 'all' ? all.length : all.filter((c) => c.status === f.value).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-ink-600 bg-ink-700 text-muted hover:text-body'
                }`}
              >
                {f.label} <span className="num">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Icon.Ledger width={26} height={26} />}
          title="No credits issued yet"
          description="Verify a plot in the queue to issue the first credit. It will appear here with full provenance."
        />
      ) : (
        <LedgerTable rows={rows} />
      )}
    </div>
  );
}

function LedgerTable({ rows }: { rows: LedgerEntry[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-2 font-medium">Credit</th>
              <th className="px-4 py-2 font-medium">Provenance</th>
              <th className="px-4 py-2 font-medium">Tonnes</th>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Value</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="bg-ink-700 transition-colors hover:bg-ink-800">
                <td className="rounded-l-xl px-4 py-3.5">
                  <p className="font-heading text-body">#{c.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted">{dateLabel(c.created_at)}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-body">{SPECIES_LABEL[c.plot_species] ?? c.plot_species}</p>
                  <p className="text-xs text-muted">{c.farmer_name}</p>
                </td>
                <td className="num px-4 py-3.5 text-body">{tonnes(c.tonnes_issued, 0)}</td>
                <td className="px-4 py-3.5">
                  <TierBadge tier={c.tier} />
                </td>
                <td className="num px-4 py-3.5 text-body">{money(c.tonnes_issued * PRICE)}</td>
                <td className="rounded-r-xl px-4 py-3.5">
                  <CreditChip status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-body">#{c.id.slice(0, 8)}</p>
                <p className="text-xs text-muted">
                  {SPECIES_LABEL[c.plot_species] ?? c.plot_species} · {c.farmer_name}
                </p>
              </div>
              <CreditChip status={c.status} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <MCell label="Tonnes" value={tonnes(c.tonnes_issued, 0)} />
              <MCell label="Tier" value={c.tier} />
              <MCell label="Value" value={money(c.tonnes_issued * PRICE)} />
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 font-heading text-sm font-semibold text-primary">
      {tier}
    </span>
  );
}

function MCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-0.5 font-medium text-body">{value}</dd>
    </div>
  );
}
