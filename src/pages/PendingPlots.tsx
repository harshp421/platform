import { useState } from 'react';
import { api, ApiError } from '../lib/api.ts';
import { useAsync } from '../lib/useAsync.ts';
import { PRICE, SPECIES_LABEL, issuedFromEstimate } from '../lib/carbon.ts';
import type { Plot, Tier } from '../lib/types.ts';
import { dateLabel, money, relativeTime, tonnes } from '../lib/format.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Alert } from '../components/Alert.tsx';
import { SkeletonRow } from '../components/Skeleton.tsx';
import { Icon } from '../components/icons.tsx';

const TIERS: { value: Tier; hint: string }[] = [
  { value: 'A', hint: 'Highest verification quality' },
  { value: 'B', hint: 'Standard verification quality' },
  { value: 'C', hint: 'Baseline verification quality' },
];

export function PendingPlots() {
  const { data, error, loading, reload } = useAsync<Plot[]>(() => api.pendingPlots());
  const plots = data ?? [];

  const [tier, setTier] = useState<Tier>('B');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  const allSelected = plots.length > 0 && selected.size === plots.length;
  const busyInSelection = [...selected].some((id) => busy.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(plots.map((p) => p.id)));
  }

  // Run verify or reject across a batch of plots. Each call is independent;
  // we collect successes/failures and surface a summary.
  async function act(ids: string[], action: 'verify' | 'reject') {
    if (ids.length === 0) return;
    if (action === 'reject') {
      const ok = window.confirm(
        ids.length === 1
          ? 'Reject this plot? No credits will be issued and it leaves the queue.'
          : `Reject ${ids.length} plots? No credits will be issued and they leave the queue.`,
      );
      if (!ok) return;
    }

    setBanner(null);
    setBusy((prev) => new Set([...prev, ...ids]));
    const call = (id: string) =>
      action === 'verify' ? api.verifyPlot(id, { tier }) : api.rejectPlot(id);
    const results = await Promise.allSettled(ids.map(call));

    let ok = 0;
    let failMsg = '';
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok += 1;
      else if (!failMsg) {
        const id = ids[i] ?? '';
        failMsg = r.reason instanceof ApiError ? r.reason.message : `Failed on ${id.slice(0, 8)}`;
      }
    });

    setBusy((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSelected(new Set());

    const verb = action === 'verify' ? 'Verified' : 'Rejected';
    const success =
      action === 'verify'
        ? `Verified ${ok} plot${ok === 1 ? '' : 's'} — credits issued and listed.`
        : `Rejected ${ok} plot${ok === 1 ? '' : 's'}.`;
    if (ok > 0 && !failMsg) {
      setBanner({ tone: 'success', msg: success });
    } else if (ok > 0 && failMsg) {
      setBanner({ tone: 'error', msg: `${verb} ${ok}, but some failed: ${failMsg}` });
    } else {
      setBanner({ tone: 'error', msg: failMsg || `${verb.slice(0, -1)} failed.` });
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Pending plots"
        subtitle="Review submitted plots and issue credits. Verifying is the trust step — it mints credits onto the ledger."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-700 px-3 py-1.5 text-sm text-muted">
            <Icon.Clock width={15} height={15} className="text-secondary" />
            {loading ? '—' : `${plots.length} awaiting`}
          </span>
        }
      />

      {banner && (
        <div className="mb-5">
          <Alert tone={banner.tone}>{banner.msg}</Alert>
        </div>
      )}
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

      {/* Tier control — the verification quality stamped on issued credits. */}
      {!loading && plots.length > 0 && (
        <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-medium text-muted hover:text-body cursor-pointer"
            >
              <Checkbox checked={allSelected} />
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
            <span className="text-sm text-muted">·</span>
            <TierPicker value={tier} onChange={setTier} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={selected.size === 0 || busyInSelection}
              onClick={() => act([...selected], 'reject')}
              className="text-state-rejected hover:border-state-rejected/50"
            >
              <Icon.X width={18} height={18} />
              Reject{selected.size > 0 ? ` ${selected.size}` : ''}
            </Button>
            <Button
              variant="cta"
              disabled={selected.size === 0}
              loading={selected.size > 0 && busyInSelection}
              onClick={() => act([...selected], 'verify')}
            >
              <Icon.Shield width={18} height={18} />
              Verify {selected.size > 0 ? `${selected.size} selected` : 'selected'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : plots.length === 0 ? (
        <EmptyState
          icon={<Icon.Check width={26} height={26} />}
          title="Queue is clear"
          description="No plots are waiting for review. New farmer submissions will appear here for verification."
        />
      ) : (
        <div className="space-y-3">
          {plots.map((p) => (
            <PendingRow
              key={p.id}
              plot={p}
              tier={tier}
              checked={selected.has(p.id)}
              busy={busy.has(p.id)}
              onToggle={() => toggle(p.id)}
              onVerify={() => act([p.id], 'verify')}
              onReject={() => act([p.id], 'reject')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingRow({
  plot,
  tier,
  checked,
  busy,
  onToggle,
  onVerify,
  onReject,
}: {
  plot: Plot;
  tier: Tier;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const issued = issuedFromEstimate(plot.estimate_tonnes);
  const value = issued * PRICE;
  return (
    <div
      className={`card flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center ${
        checked ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-3 text-left sm:flex-1"
        aria-pressed={checked}
      >
        <Checkbox checked={checked} />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon.Leaf width={20} height={20} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-body">
            {SPECIES_LABEL[plot.species]} · {plot.tree_count.toLocaleString()} trees
          </span>
          <span className="block text-xs text-muted">
            #{plot.id.slice(0, 8)} · farmer #{plot.farmer_id.slice(0, 8)} · submitted{' '}
            {relativeTime(plot.created_at)}
          </span>
        </span>
      </button>

      <dl className="grid grid-cols-3 gap-3 text-sm sm:w-auto sm:shrink-0 sm:grid-cols-3">
        <Cell label="Planted" value={dateLabel(plot.planting_date)} />
        <Cell label="Will issue" value={tonnes(issued, 0)} accent />
        <Cell label="List value" value={money(value)} />
      </dl>

      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={onReject}
          className="flex-1 text-state-rejected hover:border-state-rejected/50 sm:flex-none"
          aria-label="Reject plot"
        >
          <Icon.X width={16} height={16} />
          Reject
        </Button>
        <Button variant="ghost" loading={busy} onClick={onVerify} className="flex-1 sm:flex-none">
          <Icon.Shield width={16} height={16} />
          Verify · {tier}
        </Button>
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num mt-0.5 font-medium ${accent ? 'text-state-verified' : 'text-body'}`}>
        {value}
      </dd>
    </div>
  );
}

function TierPicker({ value, onChange }: { value: Tier; onChange: (t: Tier) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Issue tier</span>
      <div className="inline-flex rounded-lg border border-ink-600 bg-ink-800 p-0.5">
        {TIERS.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            title={t.hint}
            className={`h-7 w-8 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              value === t.value ? 'bg-primary text-white' : 'text-muted hover:text-body'
            }`}
          >
            {t.value}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
        checked ? 'border-primary bg-primary text-white' : 'border-ink-600 bg-ink-800'
      }`}
    >
      {checked && <Icon.Check width={13} height={13} />}
    </span>
  );
}
