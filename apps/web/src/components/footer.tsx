import Link from 'next/link';
import { BrandMark } from './shoe';

const COLUMNS: Array<{ title: string; links: string[] }> = [
  { title: 'Shop', links: ['New Arrivals', 'Sneakers', 'Formal', 'Boots'] },
  { title: 'Company', links: ['Our story', 'Workshops', 'Journal', 'Careers'] },
  { title: 'Support', links: ['Shipping & returns', 'Size guide', 'Care guide', 'Contact'] },
];

export function Footer() {
  return (
    <footer className="border-t border-accent bg-ink px-5 pt-18 text-white md:px-16">
      <div className="grid grid-cols-2 gap-10 pb-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[0.18em]"
          >
            <BrandMark className="h-4.5 w-9" />
            BLACK&nbsp;HORSE
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
              {col.links.map((label) => (
                <li key={label}>
                  <Link
                    href="/"
                    className="text-[13.5px] text-white/80 underline-offset-4 hover:text-white hover:underline"
                  >
                    {label}
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
