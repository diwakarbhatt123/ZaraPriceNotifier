'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

const parseZaraInput = (input: string) => {
  const trimmed = input.trim();
  let productId = '';
  let countryPath = '';

  if (!trimmed) return { productId, countryPath };
  if (/^\d+$/.test(trimmed)) return { productId: trimmed, countryPath };

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) countryPath = `${parts[0]}/${parts[1]}`;

    productId = url.searchParams.get('v1') || '';
    if (!productId) {
      const match = url.pathname.match(/-p(\d+)/) || url.pathname.match(/product\/(\d+)/);
      if (match) productId = match[1];
    }
  } catch {
    // A raw product number is handled below.
  }

  if (!productId) productId = trimmed.match(/(\d{6,})/)?.[1] || '';
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
    const response = await fetch('/api/watch', { cache: 'no-store' });
    if (response.ok) setItems(await response.json());
  };

  useEffect(() => {
    setMounted(true);
    void refresh();
  }, []);

  useEffect(() => {
    const missing = items.filter((item) => !(item.product_id in names));
    if (!missing.length) return;

    let cancelled = false;
    void Promise.all(
      missing.map(async (item) => {
        const params = new URLSearchParams({
          productId: String(item.product_id),
          countryPath: item.country_path
        });
        const response = await fetch(`/api/product-name?${params}`, { cache: 'no-store' });
        if (!response.ok) return { id: item.product_id, name: null };
        const product = await response.json();
        return { id: item.product_id, name: product.name || null };
      })
    ).then((results) => {
      if (cancelled) return;
      setNames((previous) => ({
        ...previous,
        ...Object.fromEntries(results.map(({ id, name }) => [id, name]))
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [items, names]);

  const formatDate = (value?: string) => {
    if (!mounted || !value) return 'Not checked yet';
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const productId = parsed.productId || input.trim();
    if (!productId) {
      setError('Enter a Zara product link or product reference.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(productId),
          storeId: storeId ? Number(storeId) : undefined,
          countryPath: countryPath || parsed.countryPath || undefined,
          wantedSizes: sizes.split(/[,\s]+/).map((size) => size.trim()).filter(Boolean)
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || 'Unable to add this item.');
        return;
      }

      setInput('');
      setSizes('');
      setStoreId('');
      setCountryPath('');
      setSuccess('Item added to your watchlist.');
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
    <main className="min-h-screen bg-white text-zara-black">
      <nav className="flex items-center justify-between border-b border-zara-black px-5 py-5 md:px-10">
        <a className="zara-logo" href="#top" aria-label="Zara Watchlist home">ZARA</a>
        <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] md:block">
          Availability observer / London
        </p>
        <a className="text-[11px] uppercase tracking-[0.16em] underline underline-offset-4" href="#watchlist">
          Watchlist ({items.length})
        </a>
      </nav>

      <div id="top" className="mx-auto max-w-[1600px] px-5 md:px-10">
        <header className="grid min-h-[460px] border-b border-zara-black py-10 md:grid-cols-12 md:py-16">
          <div className="flex flex-col justify-between md:col-span-8 md:pr-10">
            <p className="text-[10px] uppercase tracking-[0.22em]">Personal stock notifier</p>
            <h1 className="mt-20 max-w-5xl font-zara text-6xl uppercase leading-[0.83] tracking-[-0.075em] sm:text-8xl md:mt-0 md:text-[9rem] lg:text-[11rem]">
              Find it.
              <br />
              Before it&apos;s
              <br />
              gone.
            </h1>
          </div>
          <div className="mt-14 flex flex-col justify-end border-t border-zara-black pt-5 md:col-span-4 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="max-w-xs text-sm leading-6 text-zara-gray">
              Enter a Zara link, select your size and receive a Telegram alert as soon as it returns.
            </p>
            <p className="mt-8 text-[10px] uppercase tracking-[0.2em]">Always watching / Never checkout</p>
          </div>
        </header>

        <section className="grid border-b border-zara-black md:grid-cols-12" aria-labelledby="add-watch-title">
          <div className="border-b border-zara-black py-8 md:col-span-4 md:border-b-0 md:border-r md:pr-8">
            <p className="text-[10px] uppercase tracking-[0.2em]">01 / New watch</p>
            <h2 id="add-watch-title" className="mt-4 font-zara text-4xl uppercase leading-none tracking-[-0.04em]">Add an item</h2>
            <p className="mt-5 max-w-xs text-sm leading-6 text-zara-gray">A URL is enough. We read the product reference and region for you.</p>
          </div>

          <form onSubmit={onSubmit} className="py-8 md:col-span-8 md:pl-8">
            <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
              <label className="block border-b border-zara-black pb-2">
                <span className="text-[10px] uppercase tracking-[0.18em]">Product link or reference</span>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste Zara URL or product number"
                  className="mt-3 w-full bg-transparent text-sm outline-none placeholder:text-zara-gray/70"
                />
              </label>
              <label className="block border-b border-zara-black pb-2">
                <span className="text-[10px] uppercase tracking-[0.18em]">Sizes / optional</span>
                <input value={sizes} onChange={(event) => setSizes(event.target.value)} placeholder="S, M, L" className="mt-3 w-full bg-transparent text-sm outline-none placeholder:text-zara-gray/70" />
              </label>
              <label className="block border-b border-zara-black pb-2">
                <span className="text-[10px] uppercase tracking-[0.18em]">Store reference / optional</span>
                <input value={storeId} onChange={(event) => setStoreId(event.target.value)} placeholder="10706" className="mt-3 w-full bg-transparent text-sm outline-none placeholder:text-zara-gray/70" />
              </label>
              <label className="block border-b border-zara-black pb-2">
                <span className="text-[10px] uppercase tracking-[0.18em]">Country / optional</span>
                <input value={countryPath} onChange={(event) => setCountryPath(event.target.value)} placeholder={parsed.countryPath || 'uk/en'} className="mt-3 w-full bg-transparent text-sm outline-none placeholder:text-zara-gray/70" />
              </label>
            </div>

            <div className="mt-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="min-h-5 text-xs">
                {parsed.productId && <span>Detected reference: {parsed.productId}</span>}
                {error && <span className="text-red-700">{error}</span>}
                {success && <span>{success}</span>}
              </div>
              <button type="submit" disabled={loading} className="group inline-flex w-full items-center justify-between bg-zara-black px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-zara-gray disabled:opacity-50 sm:w-64">
                {loading ? 'Adding item' : 'Start watching'}
                <span className="text-base leading-none transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          </form>
        </section>

        <section id="watchlist" className="py-10 md:py-16" aria-labelledby="watchlist-title">
          <div className="flex items-end justify-between border-b border-zara-black pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em]">02 / Your selection</p>
              <h2 id="watchlist-title" className="mt-3 font-zara text-5xl uppercase leading-none tracking-[-0.05em] md:text-6xl">Watchlist</h2>
            </div>
            <button onClick={refresh} className="text-[10px] uppercase tracking-[0.18em] underline underline-offset-4">Refresh list</button>
          </div>

          {items.length === 0 ? (
            <div className="grid min-h-64 place-items-center border-b border-zara-black text-center">
              <div>
                <p className="font-zara text-3xl uppercase tracking-[-0.04em]">Nothing is being watched.</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-zara-gray">Your selected pieces will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid border-l border-zara-black sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <article key={item.id} className="group min-h-72 border-b border-r border-zara-black p-5 md:p-6">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em]">{String(index + 1).padStart(2, '0')}</p>
                    <span className={clsx('border px-2 py-1 text-[9px] uppercase tracking-[0.13em]', item.last_in_stock ? 'border-zara-black bg-zara-black text-white' : 'border-zara-gray text-zara-gray')}>
                      {item.last_in_stock ? 'In stock' : 'Watching'}
                    </span>
                  </div>
                  <div className="mt-12">
                    <p className="font-zara text-3xl uppercase leading-[0.95] tracking-[-0.045em]">{names[item.product_id] || 'Zara piece'}</p>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.16em]">Ref. {item.product_id}</p>
                  </div>
                  <div className="mt-10 border-t border-zara-black pt-3 text-[10px] uppercase tracking-[0.12em] text-zara-gray">
                    <p>{item.wantedSizes?.length ? `Sizes ${item.wantedSizes.join(' / ')}` : 'All sizes'}</p>
                    <p className="mt-2">Store {item.store_id} / {item.country_path}</p>
                  </div>
                  <div className="mt-5 flex items-end justify-between text-[10px] uppercase tracking-[0.11em]">
                    <span className="text-zara-gray">{formatDate(item.last_checked_at)}</span>
                    <button onClick={() => onDelete(item.id)} className="underline underline-offset-4 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="bg-zara-black px-5 py-10 text-white md:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-8 md:flex-row md:items-end">
          <p className="zara-logo text-white">ZARA</p>
          <p className="max-w-sm text-xs leading-5 text-white/60">Availability changes quickly. Your watcher checks the items you choose and sends Telegram notifications when stock returns.</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">Zara Watchlist / Personal availability service</p>
        </div>
      </footer>
    </main>
  );
}
