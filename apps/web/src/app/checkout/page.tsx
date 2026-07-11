'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/cart-context';
import { Shoe } from '@/components/shoe';
import { API_URL } from '@/lib/api';
import { formatPrice } from '@/lib/format';

type PaymentMethod = 'COD' | 'FONEPAY';

interface PlacedOrder {
  orderNumber: string;
  total: string | number;
}

export default function CheckoutPage() {
  const cart = useCart();
  const [payment, setPayment] = useState<PaymentMethod>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart.items.length === 0) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const body = {
      customer: {
        name: form.get('name'),
        phone: form.get('phone'),
        email: form.get('email') || undefined,
      },
      address: {
        line1: form.get('line1'),
        line2: form.get('line2') || undefined,
        city: form.get('city'),
        district: form.get('district') || undefined,
      },
      items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      paymentMethod: payment,
      note: form.get('note') || undefined,
    };

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(
          Array.isArray(detail?.message) ? detail.message[0] : detail?.message,
        );
      }
      const order = (await res.json()) as PlacedOrder;
      cart.clear();
      setPlaced(order);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach the store right now. Please try again, or order via phone.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-130 px-5 py-24 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-neutral">
          <Shoe className="w-10" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Order placed.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Your order <b className="text-ink">{placed.orderNumber}</b> is confirmed as
          pending. We&apos;ll call to confirm before dispatch —{' '}
          {payment === 'COD' ? 'pay when it arrives.' : 'complete payment via Fonepay.'}
        </p>
        <Link
          href="/"
          className="mt-9 inline-block rounded-xs bg-ink px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-accent"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 px-5 py-10 pb-24 md:grid-cols-[7fr_5fr] md:gap-16 md:px-16">
      <div>
        <h1 className="mb-8 font-display text-[clamp(26px,3vw,34px)] font-extrabold tracking-tight">
          Checkout
        </h1>

        <form onSubmit={submit} className="space-y-8">
          <fieldset>
            <legend className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
              Contact
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              <input required name="name" placeholder="Full name" aria-label="Full name" className="input" />
              <input required name="phone" placeholder="Phone" aria-label="Phone" className="input" />
              <input
                name="email"
                type="email"
                placeholder="Email (optional)"
                aria-label="Email"
                className="input md:col-span-2"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
              Delivery address
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              <input required name="line1" placeholder="Street / Tole" aria-label="Street" className="input md:col-span-2" />
              <input name="line2" placeholder="Landmark (optional)" aria-label="Landmark" className="input md:col-span-2" />
              <input required name="city" placeholder="City" aria-label="City" className="input" />
              <input name="district" placeholder="District" aria-label="District" className="input" />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
              Payment
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['COD', 'Cash on delivery', 'Pay when your pair arrives'],
                  ['FONEPAY', 'Fonepay', 'Scan & pay from any Nepali bank app'],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={payment === value}
                  onClick={() => setPayment(value)}
                  className={`rounded-xs border p-4 text-left transition-colors ${
                    payment === value ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
                  }`}
                >
                  <b className="block text-sm font-semibold">{label}</b>
                  <span className={`text-xs ${payment === value ? 'text-white/60' : 'text-muted'}`}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <textarea
            name="note"
            rows={2}
            placeholder="Order note (optional)"
            aria-label="Order note"
            className="input w-full"
          />

          {error && (
            <p className="border border-[#B3261E]/30 bg-[#F9E9E8] px-4 py-3 text-[13px] text-[#B3261E]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || cart.items.length === 0}
            className="w-full rounded-xs bg-ink py-4.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-muted"
          >
            {submitting
              ? 'Placing order…'
              : cart.items.length === 0
                ? 'Your bag is empty'
                : `Place order — ${formatPrice(cart.subtotal)}`}
          </button>
        </form>
      </div>

      {/* Summary */}
      <aside className="h-fit border border-line p-6 md:sticky md:top-24">
        <h2 className="mb-5 text-[15px] font-semibold">Order summary</h2>
        {cart.items.length === 0 ? (
          <p className="text-sm text-muted">
            Your bag is empty —{' '}
            <Link href="/#featured" className="text-ink underline underline-offset-4">
              browse the collection
            </Link>
            .
          </p>
        ) : (
          <>
            {cart.items.map((item) => (
              <div key={item.variantId} className="flex items-center gap-3.5 border-b border-neutral py-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center bg-neutral">
                  <Shoe className="w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.color} · {item.size} · ×{item.quantity}
                  </p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-4 text-sm">
              <span className="text-muted">Delivery</span>
              <b>Free</b>
            </div>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-semibold">
              <span>Total</span>
              <b className="font-display text-lg tabular-nums">{formatPrice(cart.subtotal)}</b>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
