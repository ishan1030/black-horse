'use client';

import Link from 'next/link';
import { useCart } from './cart-context';
import { BrandMark } from './shoe';

const LINKS = [
  { href: '/#featured', label: 'New Arrivals' },
  { href: '/#categories', label: 'Men' },
  { href: '/#categories', label: 'Women' },
  { href: '/#categories', label: 'Collections' },
];

export function AnnouncementBar() {
  return (
    <div className="bg-ink px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white/90">
      <span className="md:hidden">Free delivery across Kathmandu Valley</span>
      <span className="hidden md:inline">
        Free delivery across Kathmandu Valley &nbsp;·&nbsp; Easy 7-day returns &nbsp;·&nbsp;
        Crafted in Nepal
      </span>
    </div>
  );
}

export function Navbar() {
  const cart = useCart();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-line bg-paper/95 px-5 py-5 backdrop-blur-md md:grid-cols-[1fr_auto_1fr] md:px-16"
    >
      <div className="hidden gap-8 text-[13.5px] font-medium md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="underline-offset-6 hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        aria-label="Black Horse Shoe home"
        className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[0.18em]"
      >
        <BrandMark className="h-5 w-10" />
        BLACK&nbsp;HORSE
      </Link>

      <div className="flex justify-end gap-5">
        <button aria-label="Search" className="grid h-7 w-7 place-items-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button aria-label="Account" className="grid h-7 w-7 place-items-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          aria-label={`Bag, ${cart.count} items`}
          onClick={cart.open}
          className="relative grid h-7 w-7 place-items-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {cart.count > 0 && (
            <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white">
              {cart.count}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
