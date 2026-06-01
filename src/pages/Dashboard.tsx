import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { useAsync } from '../lib/useAsync.ts';
import { PLATFORM_SHARE, PRICE, SPECIES_LABEL } from '../lib/carbon.ts';
import type { LedgerEntry, Plot, Revenue } from '../lib/types.ts';
import { money, relativeTime, tonnes } from '../lib/format.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { Stat } from '../components/Stat.tsx';
import { Button } from '../components/Button.tsx';
import { CreditChip } from '../components/CreditChip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonCard } from '../components/Skeleton.tsx';
import { Alert } from '../components/Alert.tsx';
import { Icon } from '../components/icons.tsx';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const pending = useAsync<Plot[]>(() => api.pendingPlots());
  const ledger = useAsync<LedgerEntry[]>(() => api.ledger());
  const revenue = useAsync<Revenue>(() => api.revenue());

  const credits = ledger.data ?? [];
  const pendingCount = pending.data?.length ?? 0;
  const listed = credits.filter((c) => c.status === 'listed').length;
  const sold = credits.filter((c) => c.status === 'sold' || c.status === 'retired').length;
  const recent = [...credits]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 4);

  const firstName = user?.name?.split(' ')[0] ?? 'admin';

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="The engine room — verify plots, issue credits, and keep the ledger honest."
        action={
          <Button variant="cta" onClick={() => navigate('/pending')}>
            <Icon.Shield width={18} height={18} />
            Review queue
          </Button>
        }
      />

      {pending.error && (
        <div className="mb-5">
          <Alert tone="error">
            {pending.error}{' '}
            <button onClick={pending.reload} className="font-medium text-primary hover:underline cursor-pointer">
              Retry
            </button>
          </Alert>
        </div>
      )}

      {/* Pending callout — the platform's primary job. */}
      {!pending.loading && pendingCount > 0 && (
        <Link
          to="/pending"
          className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 transition-colors hover:border-secondary/50"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/15 text-secondary">
              <Icon.Clock width={20} height={20} />
            </span>
            <div>
              <p className="font-medium text-body">
                {pendingCount} plot{pendingCount === 1 ? '' : 's'} awaiting verification
              </p>
              <p className="text-sm text-muted">Review and issue credits to put them on the market.</p>
            </div>
          </div>
          <Icon.Arrow width={20} height={20} className="text-secondary" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pending.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Pending review"
            value={pendingCount}
            hint="Plots in the queue"
            icon={<Icon.Shield width={18} height={18} />}
            accent="amber"
          />
        )}
        {ledger.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Credits issued"
            value={credits.length}
            hint={`${tonnes(credits.reduce((s, c) => s + c.tonnes_issued, 0), 0)} total`}
            icon={<Icon.Ledger width={18} height={18} />}
            accent="green"
          />
        )}
        {ledger.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="On the market"
            value={listed}
            hint={`${sold} sold or retired`}
            icon={<Icon.Tag width={18} height={18} />}
            accent="emerald"
          />
        )}
        {revenue.loading ? (
          <SkeletonCard />
        ) : (
          <Stat
            label="Revenue"
            value={money(revenue.data?.total ?? 0, { cents: true })}
            hint={`${Math.round(PLATFORM_SHARE * 100)}% of sales`}
            icon={<Icon.Bank width={18} height={18} />}
            accent="muted"
          />
        )}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-body">Recent ledger activity</h2>
          {credits.length > 0 && (
            <Link to="/ledger" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-soft">
              View ledger
              <Icon.Arrow width={16} height={16} />
            </Link>
          )}
        </div>

        {ledger.loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Icon.Ledger width={26} height={26} />}
            title="No credits issued yet"
            description="Verify a plot in the pending queue to mint the first credit onto the ledger."
            action={
              <Button variant="cta" onClick={() => navigate('/pending')}>
                <Icon.Shield width={18} height={18} />
                Go to queue
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {recent.map((c) => (
              <Link
                key={c.id}
                to="/ledger"
                className="card flex items-center justify-between gap-4 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon.Leaf width={20} height={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-body">
                      #{c.id.slice(0, 8)} · {SPECIES_LABEL[c.plot_species] ?? c.plot_species}
                    </p>
                    <p className="text-xs text-muted">
                      {c.farmer_name} · {tonnes(c.tonnes_issued, 0)} · {money(c.tonnes_issued * PRICE)} ·{' '}
                      {relativeTime(c.created_at)}
                    </p>
                  </div>
                </div>
                <CreditChip status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
