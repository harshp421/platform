import { api } from '../lib/api.ts';
import { useAsync } from '../lib/useAsync.ts';
import { FARMER_SHARE, PLATFORM_SHARE, PRICE } from '../lib/carbon.ts';
import type { LedgerEntry, Revenue as RevenueType } from '../lib/types.ts';
import { money, tonnes } from '../lib/format.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { Stat } from '../components/Stat.tsx';
import { Alert } from '../components/Alert.tsx';
import { SkeletonCard } from '../components/Skeleton.tsx';
import { Icon } from '../components/icons.tsx';

export function Revenue() {
  const revenue = useAsync<RevenueType>(() => api.revenue());
  const ledger = useAsync<LedgerEntry[]>(() => api.ledger());

  const credits = ledger.data ?? [];
  // Payouts land when a credit is bought; retired credits were bought too.
  const paid = credits.filter((c) => c.status === 'sold' || c.status === 'retired');
  const gmv = paid.reduce((s, c) => s + c.tonnes_issued * PRICE, 0);
  const farmerPayouts = gmv * FARMER_SHARE;
  const listed = credits.filter((c) => c.status === 'listed');
  const pipeline = listed.reduce((s, c) => s + c.tonnes_issued * PRICE, 0) * PLATFORM_SHARE;

  const total = revenue.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Revenue"
        subtitle={`The platform keeps ${Math.round(PLATFORM_SHARE * 100)}% of every sale. Amounts are recorded, not transferred (MVP).`}
      />

      {revenue.error && (
        <div className="mb-5">
          <Alert tone="error">
            {revenue.error}{' '}
            <button
              onClick={revenue.reload}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              Retry
            </button>
          </Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {revenue.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Platform revenue"
            value={money(total, { cents: true })}
            hint={`${Math.round(PLATFORM_SHARE * 100)}% of sales, banked`}
            icon={<Icon.Bank width={18} height={18} />}
            accent="green"
          />
        )}
        {ledger.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Gross sales value"
            value={money(gmv)}
            hint={`${paid.length} credit${paid.length === 1 ? '' : 's'} sold`}
            icon={<Icon.Coins width={18} height={18} />}
            accent="amber"
          />
        )}
        {ledger.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Paid to farmers"
            value={money(farmerPayouts)}
            hint={`${Math.round(FARMER_SHARE * 100)}% of sales`}
            icon={<Icon.Users width={18} height={18} />}
            accent="emerald"
          />
        )}
        {ledger.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Potential (listed)"
            value={money(pipeline)}
            hint={`${listed.length} credit${listed.length === 1 ? '' : 's'} on the market`}
            icon={<Icon.Tag width={18} height={18} />}
            accent="muted"
          />
        )}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="text-base font-semibold text-body">How a sale splits</h2>
        <p className="mt-1 text-sm text-muted">
          At {money(PRICE)} per tonne, every purchase divides between the farmer and the platform.
        </p>
        <div className="mt-4 space-y-3">
          <SplitBar
            label={`Farmer share (${Math.round(FARMER_SHARE * 100)}%)`}
            value={money(farmerPayouts)}
            pct={FARMER_SHARE}
            tone="emerald"
          />
          <SplitBar
            label={`Platform share (${Math.round(PLATFORM_SHARE * 100)}%)`}
            value={money(total)}
            pct={PLATFORM_SHARE}
            tone="green"
          />
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Icon.Info width={14} height={14} className="text-primary" />
          {tonnes(paid.reduce((s, c) => s + c.tonnes_issued, 0), 0)} of carbon sold across{' '}
          {paid.length} credit{paid.length === 1 ? '' : 's'}.
        </p>
      </div>
    </div>
  );
}

function SplitBar({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: 'emerald' | 'green';
}) {
  const bar = tone === 'emerald' ? 'bg-state-verified' : 'bg-cta';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="num font-medium text-body">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
