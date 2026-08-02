import Link from 'next/link';
import { BrandMark } from './shoe';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Shop',
    links: [
      { label: 'Shop all', href: '/products' },
      { label: 'Sneakers', href: '/products?type=sneakers' },
      { label: 'Formal', href: '/products?type=formal' },
      { label: 'Boots', href: '/products?type=boots' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our story', href: '/about' },
      { label: 'The workshop', href: '/#workshop-h' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Shipping & returns', href: '/support#shipping' },
      { label: 'Size guide', href: '/support#size-guide' },
      { label: 'Care guide', href: '/support#care' },
      { label: 'Contact', href: '/support#contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-accent bg-ink px-5 pt-18 text-white md:px-16">
      <div className="grid grid-cols-2 gap-10 pb-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" aria-label="Black Horse Shoe home" className="inline-flex">
            <BrandMark className="text-[17px]" />
          </Link>
          <p className="mt-4 max-w-[34ch] text-[13.5px] leading-relaxed text-white/55">
            Premium modern footwear, designed and hand-finished in Kathmandu, Nepal.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4.5 text-[11.5px] uppercase tracking-[0.18em] text-white/45">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-white/80 underline-offset-4 hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
        <div
          className="translate-y-[18%] whitespace-nowrap text-center font-display text-[11vw] font-extrabold leading-[0.86] tracking-[0.04em] text-transparent"
          style={{ WebkitTextStroke: '1px rgba(255,255,255,.16)' }}
        >
          BLACK&nbsp;HORSE
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-4 border-t border-accent py-5 text-xs text-white/40">
        <span>© 2026 Black Horse Shoe Pvt. Ltd. — Kathmandu, Nepal</span>
        <span>Privacy&nbsp;&nbsp;·&nbsp;&nbsp;Terms</span>
      </div>
    </footer>
  );
}
