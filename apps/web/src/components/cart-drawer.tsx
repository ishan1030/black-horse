'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useCart } from './cart-context';
import { Shoe } from './shoe';

export function CartDrawer() {
  const cart = useCart();

  if (!cart.isOpen) return null;

  return (
    <div className="fixed inset-0 z-100" role="dialog" aria-label="Shopping bag">
      <button
        aria-label="Close bag"
        className="absolute inset-0 bg-ink/40"
        onClick={cart.close}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-105 flex-col bg-paper shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-lg font-bold">
            Your bag <span className="text-muted font-medium">({cart.count})</span>
          </h2>
          <button onClick={cart.close} aria-label="Close" className="text-2xl leading-none">
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6">
          {cart.items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Your bag is empty. Every pair is waiting.
            </p>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center gap-4 border-b border-neutral py-4"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded bg-neutral">
                  <Shoe className="w-11" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.color} · {item.size}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 rounded border border-line px-2 py-0.5">
                      <button
                        onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        –
                      </button>
                      <span className="min-w-4 text-center font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </span>
                    <button
                      className="text-muted underline underline-offset-2"
                      onClick={() => cart.remove(item.variantId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <footer className="border-t border-line px-6 py-5">
            <div className="mb-4 flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <b className="tabular-nums">{formatPrice(cart.subtotal)}</b>
            </div>
            <Link
              href="/checkout"
              onClick={cart.close}
              className="block w-full rounded-xs bg-ink py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-accent"
            >
              Checkout
            </Link>
            <p className="mt-3 text-center text-xs text-muted">
              Cash on delivery or Fonepay · Free delivery in Kathmandu Valley
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
