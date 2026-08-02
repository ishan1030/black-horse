'use client';

/**
 * Navbar search: matches shoe names, categories (loafers, sneakers, …),
 * SKUs / article codes, and descriptions. The catalog loads once when the
 * panel first opens, then filtering is instant on every keystroke.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, mediaUrl } from '@/lib/api';
import { formatPrice } from '@/lib/format';

interface SearchItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image?: string;
  haystack: string;
}

export function SearchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the catalog the first time the panel opens.
  useEffect(() => {
    if (!open || items) return;
    fetch(`${API_URL}/products?publishedOnly=true&pageSize=100`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const mapped: SearchItem[] = (data?.items ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category?.name ?? '',
          price: Number(p.variants?.[0]?.price ?? 0),
          image: p.images?.[0]?.url,
          haystack: [
            p.name,
            p.category?.name,
            p.description,
            ...(p.variants ?? []).map((v: any) => v.sku),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        }));
        setItems(mapped);
      })
      .catch(() => setItems([]));
  }, [open, items]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || !items) return [];
    return items.filter((item) => words.every((w) => item.haystack.includes(w))).slice(0, 8);
  }, [q, items]);

  function go(slug: string) {
    setOpen(false);
    setQ('');
    router.push(`/products/${slug}`);
  }

  return (
    <>
      <button
        aria-label="Search"
        className="grid h-7 w-7 place-items-center"
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto mt-[10vh] w-[min(640px,92vw)] overflow-hidden rounded-md bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) go(results[0].slug);
                }}
                placeholder="Search loafers, sneakers, boots, a shoe name…"
                aria-label="Search products"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="text-[12px] font-medium uppercase tracking-wider text-muted hover:text-ink"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {q.trim() === '' ? (
                <p className="px-5 py-8 text-center text-[13.5px] text-muted">
                  Type a style — <b className="font-medium text-ink">loafers</b>,{' '}
                  <b className="font-medium text-ink">sneakers</b>,{' '}
                  <b className="font-medium text-ink">boots</b> — or a shoe&apos;s name.
                </p>
              ) : items === null ? (
                <p className="px-5 py-8 text-center text-[13.5px] text-muted">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13.5px] text-muted">
                  Nothing matches “{q.trim()}” — try a style like loafers or sneakers.
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {results.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => go(item.slug)}
                        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-neutral"
                      >
                        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden bg-neutral">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl(item.image)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider text-faint">no photo</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{item.name}</span>
                          <span className="block text-[12.5px] text-muted">{item.category}</span>
                        </span>
                        <span className="text-[13.5px] font-semibold">{formatPrice(item.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
