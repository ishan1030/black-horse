'use client';

import Link from 'next/link';
import { useCart } from './cart-context';
import { SearchButton } from './search';
import { BrandMark } from './shoe';

export function Navbar({
  categories = [],
}: {
  categories?: Array<{ name: string; slug: string }>;
}) {
  const cart = useCart();
  const links = [
    { href: '/products', label: 'Shop All' },
    ...categories.slice(0, 4).map((c) => ({ href: `/products?type=${c.slug}`, label: c.name })),
  ];

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-line bg-paper/95 px-5 py-5 backdrop-blur-md md:grid-cols-[1fr_auto_1fr] md:px-16"
    >
      <div className="hidden gap-8 text-[13.5px] font-medium md:flex">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="underline-offset-6 hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <Link href="/" aria-label="Black Horse Shoe home" className="flex items-center">
        <BrandMark className="text-[17px]" />
      </Link>

      <div className="flex justify-end gap-5">
        <SearchButton />
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
