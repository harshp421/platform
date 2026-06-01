// Shared domain types — mirror the backend data model (spac/001_poc.md §4).
// The platform panel is the engine + trust layer: it sees the pending-plot queue,
// issues credits on verify, and owns the full ledger + revenue.

export type Role = 'farmer' | 'platform' | 'org';

export type PlotStatus = 'submitted' | 'verified' | 'rejected';

export type CreditStatus = 'issued' | 'listed' | 'sold' | 'retired' | 'reversed';

export type Tier = 'A' | 'B' | 'C';

/** A species the carbon formula knows how to price (spac/001_poc.md §5). */
export type Species = 'acacia' | 'teak' | 'eucalyptus' | 'mango' | 'bamboo';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** A plot as returned by GET /plots/pending. Dates are ISO strings. */
export interface Plot {
  id: string;
  farmer_id: string;
  species: Species;
  tree_count: number;
  planting_date: string;
  /** Gross estimate from the §5 calc; issuance applies the buffer. */
  estimate_tonnes: number;
  status: PlotStatus;
  created_at: string;
}

/** Base credit row (credits table). */
export interface Credit {
  id: string;
  plot_id: string;
  tonnes_issued: number;
  tier: Tier;
  price_per_tonne: number;
  status: CreditStatus;
  owner_id: string | null;
  certificate_id: string | null;
  created_at: string;
}

/** Credit joined with plot + farmer provenance, as returned by GET /ledger. */
export interface LedgerEntry extends Credit {
  plot_species: Species;
  farmer_id: string;
  farmer_name: string;
}

/** GET /revenue → sum of `platform_amount` across payouts. */
export interface RevenueResponse {
  platform_amount_total: number;
}

export interface Revenue {
  total: number;
}

export interface VerifyInput {
  tier: Tier;
}
