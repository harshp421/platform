import type { CreditStatus } from '../lib/types.ts';
import { Icon } from './icons.tsx';

// Credit-state visual language (CLAUDE.md) — derived from design tokens, never
// hardcoded per screen. Lifecycle: issued → listed → sold → retired (| reversed).
// retired is final and carries a lock; reversed is the only "error" state.

const MAP: Record<
  CreditStatus,
  { label: string; text: string; ring: string; Glyph: typeof Icon.Tag }
> = {
  issued: {
    label: 'Issued',
    text: 'text-secondary',
    ring: 'border-secondary/30 bg-secondary/10',
    Glyph: Icon.Spark,
  },
  listed: {
    label: 'Listed',
    text: 'text-state-verified',
    ring: 'border-state-verified/30 bg-state-verified/10',
    Glyph: Icon.Tag,
  },
  sold: {
    label: 'Sold',
    text: 'text-state-sold',
    ring: 'border-state-sold/30 bg-state-sold/10',
    Glyph: Icon.Users,
  },
  retired: {
    label: 'Retired',
    text: 'text-state-verified',
    ring: 'border-state-verified/40 bg-state-verified/10',
    Glyph: Icon.Lock,
  },
  reversed: {
    label: 'Reversed',
    text: 'text-state-rejected',
    ring: 'border-state-rejected/30 bg-state-rejected/10',
    Glyph: Icon.X,
  },
};

export function CreditChip({ status }: { status: CreditStatus }) {
  const s = MAP[status];
  const { Glyph } = s;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.ring} ${s.text}`}
    >
      <Glyph width={13} height={13} />
      {s.label}
    </span>
  );
}
