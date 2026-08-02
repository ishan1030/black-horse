import Link from 'next/link';

export const metadata = { title: 'Our story' };

const STATS = [
  { value: '47', label: 'pairs of hands per shoe' },
  { value: '6-mo', label: 'craft warranty' },
  { value: '100%', label: 'made in Nepal' },
];

export default function AboutPage() {
  return (
    <div className="px-5 py-16 md:px-16 md:py-24">
      <div className="mx-auto max-w-[70ch]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Our story</p>
        <h1 className="mb-8 mt-5 font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-tight tracking-tight">
          Every pair tells a story of Himalayan craftsmanship.
        </h1>
        <div className="space-y-5 text-[15.5px] leading-relaxed text-muted">
          <p>
            Black Horse Shoe began in a small workshop in Kathmandu with a simple conviction:
            footwear made in Nepal can stand beside the best in the world. We source full-grain
            leather from tanneries in the Terai, cut every panel by hand, and finish each pair in
            our Kathmandu workshop.
          </p>
          <p>
            From the first cut to the final polish, each shoe passes through 47 pairs of hands —
            cutters, stitchers, lasters, finishers — many of whom learned the craft from their
            parents. We build shoes with stitched constructions meant to be resoled, not replaced,
            and back every pair with a six-month craft warranty.
          </p>
          <p>
            Timeless silhouettes, honest materials, and prices that respect both the maker and the
            wearer — that is the whole idea.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap gap-x-16 gap-y-8">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <b className="block font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-tight">
                {stat.value}
              </b>
              <span className="text-xs uppercase tracking-[0.14em] text-muted">{stat.label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/products"
          className="mt-14 inline-block bg-ink px-7 py-3.5 text-[13.5px] font-semibold tracking-wide text-white transition-colors hover:bg-accent"
        >
          Shop the collection →
        </Link>
      </div>
    </div>
  );
}
