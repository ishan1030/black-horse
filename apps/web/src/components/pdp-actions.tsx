'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/components/cart-context';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

/** Colour swatch hex values for known colours; falls back to ink. */
const SWATCH: Record<string, string> = {
  Black: '#111111',
  Brown: '#5B4636',
  'Off-white': '#F2F0EB',
  White: '#F2F0EB',
  Tan: '#B08D57',
};

export function PdpActions({ product }: { product: Product }) {
  const cart = useCart();
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product.variants],
  );
  const [color, setColor] = useState(colors[0] ?? 'Black');

  const sizes = useMemo(
    () => product.variants.filter((v) => v.color === color),
    [product.variants, color],
  );
  const [variantId, setVariantId] = useState<string | null>(
    sizes.find((v) => v.stockQty > 0)?.id ?? null,
  );
  const selected = sizes.find((v) => v.id === variantId) ?? null;
  const price = selected?.price ?? product.variants[0]?.price ?? 0;

  function selectColor(next: string) {
    setColor(next);
    const nextSizes = product.variants.filter((v) => v.color === next);
    setVariantId(nextSizes.find((v) => v.stockQty > 0)?.id ?? null);
  }

  function addToBag() {
    if (!selected) return;
    cart.add({
      variantId: selected.id,
      productSlug: product.slug,
      name: product.name,
      size: selected.size,
      color: selected.color,
      unitPrice: selected.price,
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-3.5">
        <span className="text-[22px] font-semibold tabular-nums">{formatPrice(price)}</span>
      </div>
      <p className="mb-7 mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
        {product.description}
      </p>

      {colors.length > 0 && (
        <>
          <div className="mb-3 flex items-baseline justify-between text-[13px] font-semibold">
            Colour <span className="font-normal text-muted">{color}</span>
          </div>
          <div className="mb-7 flex gap-3">
            {colors.map((c) => (
              <button
                key={c}
                aria-label={c}
                aria-pressed={c === color}
                onClick={() => selectColor(c)}
                className={`h-8.5 w-8.5 rounded-full border border-line ${
                  c === color ? 'outline-2 outline-offset-3 outline-ink' : ''
                }`}
                style={{ background: SWATCH[c] ?? '#111111' }}
              />
            ))}
          </div>
        </>
      )}

      <div className="mb-3 flex items-baseline justify-between text-[13px] font-semibold">
        Size — EU
        <a href="#" className="text-[12.5px] font-medium text-muted underline underline-offset-4">
          Size guide
        </a>
      </div>
      <div className="mb-2.5 grid grid-cols-5 gap-2.5" role="listbox" aria-label="Select size">
        {sizes.map((v) => {
          const out = v.stockQty === 0;
          const active = v.id === variantId;
          return (
            <button
              key={v.id}
              role="option"
              aria-selected={active}
              disabled={out}
              onClick={() => setVariantId(v.id)}
              className={`border py-3 text-center text-[13.5px] font-medium tabular-nums transition-colors ${
                active
                  ? 'border-ink bg-ink text-white'
                  : out
                    ? 'cursor-not-allowed border-line bg-neutral text-[#C6C6C6] line-through'
                    : 'border-line hover:border-ink'
              }`}
            >
              {v.size.replace('EU ', '')}
            </button>
          );
        })}
      </div>
      {selected && selected.stockQty > 0 && selected.stockQty <= 3 && (
        <p className="mb-7 flex items-center gap-2 text-[12.5px] font-medium text-warn before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:content-['']">
          Only {selected.stockQty} left in {selected.size}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={addToBag}
          disabled={!selected}
          className="flex-1 rounded-xs bg-ink py-4.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted"
        >
          {selected ? `Add to bag — ${formatPrice(price)}` : 'Select a size'}
        </button>
        <button
          aria-label="Add to wishlist"
          className="grid w-13.5 place-items-center rounded-xs border border-line transition-colors hover:border-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 20s-7-4.5-9-9c-1.3-3 1-7 4.5-7C10 4 12 6.5 12 6.5S14 4 16.5 4C20 4 22.3 8 21 11c-2 4.5-9 9-9 9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="mt-3.5 text-center text-xs text-muted">
        Cash on delivery or Fonepay · Free delivery in Kathmandu Valley
      </p>
    </div>
  );
}
