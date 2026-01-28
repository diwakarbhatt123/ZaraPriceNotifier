'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

const parseZaraInput = (input: string) => {
  const trimmed = input.trim();
  let productId = '';
  let countryPath = '';

  if (!trimmed) {
    return { productId, countryPath };
  }

  if (/^\d+$/.test(trimmed)) {
    return { productId: trimmed, countryPath };
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      countryPath = `${parts[0]}/${parts[1]}`;
    }
    const v1 = url.searchParams.get('v1');
    if (v1) {
      productId = v1;
    }
    if (!productId) {
      const match = url.pathname.match(/-p(\d+)/) || url.pathname.match(/product\/(\d+)/);
      if (match) {
        productId = match[1];
      }
    }
  } catch {
    // ignore
  }

  if (!productId) {
    const digits = trimmed.match(/(\d{6,})/);
    if (digits) {
      productId = digits[1];
    }
  }

  return { productId, countryPath };
};

type WatchItem = {
  id: number;
  product_id: number;
  store_id: number;
  country_path: string;
  wantedSizes: string[];
  last_in_stock?: number;
  last_checked_at?: string;
};

export default function Page() {
  const [input, setInput] = useState('');
  const [sizes, setSizes] = useState('');
  const [storeId, setStoreId] = useState('');
  const [countryPath, setCountryPath] = useState('');
  const [items, setItems] = useState<WatchItem[]>([]);
  const [names, setNames] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  const parsed = useMemo(() => parseZaraInput(input), [input]);

  const refresh = async () => {
    const res = await fetch('/api/watch', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const missing = items.filter((item) => !(item.product_id in names));
    if (!missing.length) return;

    let cancelled = false;
    const fetchNames = async () => {
      const results = await Promise.all(
        missing.map(async (item) => {
          const params = new URLSearchParams({
            productId: String(item.product_id),
            countryPath: item.country_path
          });
          const res = await fetch(`/api/product-name?${params.toString()}`, { cache: 'no-store' });
          if (!res.ok) return { id: item.product_id, name: null as string | null };
          const data = await res.json();
          return { id: item.product_id, name: data.name || null };
        })
      );
      if (cancelled) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const result of results) {
          next[result.id] = result.name;
        }
        return next;
      });
    };
    fetchNames();
    return () => {
      cancelled = true;
    };
  }, [items, names]);

  const formatDate = (value?: string) => {
    if (!mounted || !value) return '—';
    return new Date(value).toLocaleString();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const productId = parsed.productId || input.trim();
    if (!productId) {
      setError('Please provide a Zara product ID or URL.');
      return;
    }

    const sizesArray = sizes
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const payload = {
        productId: Number(productId),
        storeId: storeId ? Number(storeId) : undefined,
        countryPath: countryPath || parsed.countryPath || undefined,
        wantedSizes: sizesArray
      };

      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to create watch item.');
        return;
      }

      setInput('');
      setSizes('');
      setStoreId('');
      setCountryPath('');
      setSuccess('Watch item created.');
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    await fetch(`/api/watch/${id}`, { method: 'DELETE' });
    await refresh();
  };

  return (
    <main className="min-h-screen bg-mesh bg-fixed px-6 py-12 text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-white/80 p-8 shadow-soft backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate">Zara Watchlist</p>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">
              Track the exact size you want — and get alerted instantly.
            </h1>
            <p className="mt-4 text-base text-slate">
              Drop a Zara URL or product ID, pick your sizes, and we will watch stock
              status for you. The checker runs on your server and pushes Telegram alerts
              the moment it flips in stock.
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-3xl bg-ink p-8 text-fog shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-fog/70">Quick tips</p>
            <ul className="mt-4 space-y-3 text-sm text-fog/80">
              <li>Paste any Zara product URL, we auto-detect the product ID.</li>
              <li>Sizes are case-insensitive, separate with spaces or commas.</li>
              <li>Leave sizes empty to watch for any size restock.</li>
            </ul>
            <div className="mt-8 rounded-2xl bg-ember px-4 py-3 text-sm text-ink">
              Watching from London? Set store locator to your lat/lng for pickup info.
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl bg-white/90 p-8 shadow-soft backdrop-blur"
          >
            <h2 className="font-display text-2xl">Add a watch item</h2>
            <div className="mt-6 grid gap-4">
              <label className="text-sm font-semibold">Zara URL or product ID</label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://www.zara.com/uk/en/-p463521186.html?v1=463521186"
                className="rounded-2xl border border-slate/30 px-4 py-3 text-sm focus:border-ember focus:outline-none"
              />
              {parsed.productId && (
                <p className="text-xs text-slate">
                  Detected product ID: <span className="font-semibold">{parsed.productId}</span>
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold">Sizes (optional)</label>
              <input
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                placeholder="S, M, L"
                className="rounded-2xl border border-slate/30 px-4 py-3 text-sm focus:border-ember focus:outline-none"
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Store ID (optional)</label>
                <input
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="10706"
                  className="mt-2 w-full rounded-2xl border border-slate/30 px-4 py-3 text-sm focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Country path (optional)</label>
                <input
                  value={countryPath}
                  onChange={(e) => setCountryPath(e.target.value)}
                  placeholder={parsed.countryPath || 'uk/en'}
                  className="mt-2 w-full rounded-2xl border border-slate/30 px-4 py-3 text-sm focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {success && <p className="mt-4 text-sm text-emerald-600">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition',
                loading ? 'bg-slate/40 text-white' : 'bg-ember text-ink hover:bg-emberDark'
              )}
            >
              {loading ? 'Saving...' : 'Start watching'}
            </button>
          </form>

          <div className="rounded-3xl bg-white/90 p-8 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Active watchlist</h2>
              <button
                onClick={refresh}
                className="rounded-full border border-slate/30 px-3 py-1 text-xs font-semibold text-slate hover:border-ember hover:text-ember"
              >
                Refresh
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate/40 p-6 text-center text-sm text-slate">
                  No items yet. Add your first watch item.
                </div>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate/20 bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase text-slate">Product</p>
                      <p className="font-display text-lg">{item.product_id}</p>
                      {names[item.product_id] && (
                        <p className="mt-1 text-xs text-slate">{names[item.product_id]}</p>
                      )}
                      <p className="text-xs text-slate">Store {item.store_id} · {item.country_path}</p>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        item.last_in_stock ? 'bg-mint text-ink' : 'bg-slate/15 text-slate'
                      )}
                    >
                      {item.last_in_stock ? 'In stock' : 'Watching'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate">
                    Sizes: {item.wantedSizes?.length ? item.wantedSizes.join(', ') : 'Any size'}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate">
                      Last checked: {formatDate(item.last_checked_at)}
                    </p>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-xs font-semibold text-ember hover:text-emberDark"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-ink p-8 text-fog shadow-soft">
          <h3 className="font-display text-2xl">How notifications work</h3>
          <p className="mt-3 text-sm text-fog/70">
            We check Zara availability on a schedule and only alert when the state
            flips from out-of-stock to in-stock. Store pickup info is included when
            available. You can remove a watch item at any time.
          </p>
        </section>
      </div>
    </main>
  );
}
