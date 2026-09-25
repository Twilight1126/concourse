// Tiny chainable query client → local Express/SQLite API (POST /api/q).
// Same call shape the components already used, so no cloud service is needed.
type Filter = { col: string; op: 'eq' | 'in'; value?: unknown; values?: unknown[] };
type Result<T = any> = { data: T; error: { message: string } | null };

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

class Query implements PromiseLike<Result> {
  private p: {
    table: string;
    op?: 'select' | 'insert' | 'update' | 'delete';
    filters: Filter[];
    values?: unknown;
    order?: { col: string; asc: boolean };
    single?: boolean;
  };
  constructor(table: string) { this.p = { table, filters: [] }; }
  select(_cols?: string, _opts?: unknown) { this.p.op ??= 'select'; return this; }
  insert(values: unknown) { this.p.op = 'insert'; this.p.values = values; return this; }
  update(values: unknown) { this.p.op = 'update'; this.p.values = values; return this; }
  delete() { this.p.op = 'delete'; return this; }
  eq(col: string, value: unknown) { this.p.filters.push({ col, op: 'eq', value }); return this; }
  in(col: string, values: unknown[]) { this.p.filters.push({ col, op: 'in', values }); return this; }
  order(col: string, opts: { ascending?: boolean } = {}) { this.p.order = { col, asc: opts.ascending ?? true }; return this; }
  single() { this.p.single = true; return this; }

  then<A = Result, B = never>(
    onfulfilled?: ((v: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((e: unknown) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<Result> {
    try {
      const res = await fetch(`${API}/api/q`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...this.p, op: this.p.op ?? 'select' }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: { message: json.error ?? 'Request failed' } };
      const rows = json.data as unknown[];
      if (this.p.single) return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'Not found' } };
      return { data: rows, error: null };
    } catch {
      return { data: null, error: { message: 'Cannot reach the Concourse server. Is it running? (npm start)' } };
    }
  }
}

export const db = { from: (table: string) => new Query(table) };

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed');
  return res.json();
}
export const apiUrl = (p: string) => `${API}${p}`;
