// Typed client for the Canopy backend (spac/001_poc.md §7).
// The platform panel calls the Auth + Platform endpoints (pending queue, verify,
// ledger, revenue); farmer/org endpoints are owned by their panels.
//
// All errors leave the server in a single envelope (backend skill convention):
//   { error: { code, message, details? } }
// We unwrap that into an `ApiError` so UI can show `message` and branch on `code`.

import type {
  AuthResponse,
  Credit,
  LedgerEntry,
  Plot,
  Revenue,
  RevenueResponse,
  Role,
  VerifyInput,
} from './types.ts';

// Backend base URL — same approach as the farmer panel. Set VITE_API_TARGET to
// the backend origin (e.g. https://canopy-backend.onrender.com) before building;
// it's inlined at BUILD time, not read at runtime. Normalized so a trailing slash
// or a stray `/api` suffix doesn't produce a broken path like `//auth/login`.
function resolveBase(): string {
  const env = import.meta.env;
  let base =
    (env.VITE_API_TARGET as string | undefined)?.trim() || 'http://localhost:3000/api';
  base = base.replace(/\/+$/, ''); // drop trailing slash(es)
  // For an absolute backend origin, routes live at the root — drop a `/api` suffix.
  if (/^https?:\/\//i.test(base)) {
    base = base.replace(/\/api$/, '');
  }
  return base;
}

const BASE = resolveBase();

const TOKEN_KEY = 'canopy.platform.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Set false for auth calls that must not carry a stale token. */
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network / CORS / backend-not-running.
    throw new ApiError('NETWORK', 'Could not reach the Canopy server. Is the backend running?', 0);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeJson(text) : null;

  if (!res.ok) {
    const env = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)
      ?.error;
    throw new ApiError(
      env?.code ?? 'ERROR',
      env?.message ?? `Request failed (${res.status})`,
      res.status,
      env?.details,
    );
  }
  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: (input: { email: string; password: string; name: string; role: Role }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),

  // Platform
  pendingPlots: () => request<Plot[]>('/plots/pending'),

  /** Verify a plot → issues + lists a credit, writes ledger events. Returns the new credit. */
  verifyPlot: (plotId: string, input: VerifyInput) =>
    request<Credit>(`/plots/${plotId}/verify`, { method: 'POST', body: input }),

  /** Reject a submitted plot → status 'rejected'. No credit issued. Returns the plot. */
  rejectPlot: (plotId: string) =>
    request<Plot>(`/plots/${plotId}/reject`, { method: 'POST' }),

  ledger: () => request<LedgerEntry[]>('/ledger'),

  // Normalize the backend's `{ platform_amount_total }` into `{ total }`.
  revenue: async (): Promise<Revenue> => {
    const res = await request<RevenueResponse>('/revenue');
    return { total: res.platform_amount_total };
  },
};
