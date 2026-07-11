import Link from 'next/link';
import HeroScrollAnimation, { type HeroProduct } from '@/components/ui/hero-scroll-animation';
import { Shoe } from '@/components/shoe';
import { getCategories, getFeaturedProducts, getGalleryPosts, mediaUrl } from '@/lib/api';

const MARQUEE_ITEMS = [
  'Crafted in Kathmandu',
  'Full-grain leather',
  '47 pairs of hands',
  '2-year warranty',
];

const CRAFT_STATS = [
  { value: '47', label: 'pairs of hands' },
  { value: '72h', label: 'of finishing' },
  { value: '2 yr', label: 'craft warranty' },
];

export default async function HomePage() {
  const [products, categories, gallery] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getGalleryPosts(),
  ]);

  const heroProducts: HeroProduct[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.variants[0]?.price ?? 0,
    imageUrl: p.images[0]?.url,
    imageAlt: p.images[0]?.alt,
  }));

  return (
    <>
      {/* Scroll-linked hero + collection showcase */}
      <HeroScrollAnimation products={heroProducts} />

      {/* Marquee */}
      <div aria-hidden="true" className="overflow-hidden border-b border-line py-4.5">
        <div className="animate-marquee flex w-max gap-16 whitespace-nowrap font-display text-[13px] font-bold uppercase tracking-[0.26em] text-muted">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="after:ml-16 after:text-line after:content-['·']">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
      <section id="categories" className="px-5 py-16 md:px-16 md:py-24">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(26px,3vw,34px)] font-extrabold tracking-tight">
            Shop by Category
          </h2>
          <Link href="/#featured" className="text-[13.5px] font-medium underline-offset-4 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {categories.slice(0, 3).map((cat) => (
            <Link
              key={cat.id}
              href="/#featured"
              className="group flex aspect-[421/380] flex-col justify-between overflow-hidden bg-neutral p-8 pt-10"
            >
              <Shoe className="m-auto w-[64%] transition-transform duration-450 ease-out group-hover:scale-105 group-hover:-rotate-2" />
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">{cat.name}</h3>
                  <small className="text-[12.5px] text-muted">
                    {cat.productCount > 0 ? `${cat.productCount} styles` : 'Explore'}
                  </small>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full border border-ink transition-colors group-hover:bg-ink group-hover:text-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* From the workshop — photos posted from Telegram */}
      {gallery.length > 0 && (
        <section aria-labelledby="workshop-h" className="px-5 pb-16 md:px-16 md:pb-24" style={{ paddingTop: 0 }}>
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="workshop-h" className="font-display text-[clamp(26px,3vw,34px)] font-extrabold tracking-tight">
              From the workshop
            </h2>
            <span className="text-[13.5px] font-medium text-muted">Fresh from Kathmandu</span>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {gallery.slice(0, 8).map((post) => (
              <figure key={post.id} className="group">
                <div className="relative aspect-square overflow-hidden bg-neutral">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(post.imageUrl)}
                    alt={post.caption || 'From the Black Horse workshop'}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-450 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                {post.caption && (
                  <figcaption className="mt-3 text-[13px] leading-relaxed text-muted">
                    {post.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Craft band */}
      <section id="craft" className="bg-neutral px-5 py-24 text-center md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Our Craft</p>
        <h2 className="mx-auto mb-4.5 mt-5 max-w-[22ch] font-display text-[clamp(30px,3.8vw,44px)] font-extrabold leading-tight tracking-tight">
          Every pair tells a story of Himalayan craftsmanship.
        </h2>
        <p className="mx-auto mb-5.5 max-w-[62ch] text-[15.5px] leading-relaxed text-muted">
          From tanneries in the Terai to workshops in Kathmandu — each shoe passes through
          47 pairs of hands before it reaches yours.
        </p>
        <Link href="/" className="text-[13.5px] font-medium underline underline-offset-6">
          Read our story →
        </Link>
        <div className="mt-14 flex flex-wrap justify-center gap-x-16 gap-y-8 md:gap-x-22">
          {CRAFT_STATS.map((stat) => (
            <div key={stat.label}>
              <b className="block font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-tight">
                {stat.value}
              </b>
              <span className="text-xs uppercase tracking-[0.14em] text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="flex flex-wrap items-center justify-between gap-10 bg-ink px-5 py-18 text-white md:px-16">
        <div>
          <h2 className="font-display text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-tight">
            Join the stable.
          </h2>
          <p className="mt-2 text-[14.5px] text-white/60">
            Early access to drops, exclusive offers, and stories from the workshop.
          </p>
        </div>
        <form className="flex flex-wrap gap-3" action="#">
          <input
            type="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            className="w-[min(340px,72vw)] rounded-xs border border-white/30 bg-transparent px-5 py-3.5 text-sm placeholder:text-white/45 focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xs bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-neutral"
          >
            Subscribe
          </button>
        </form>
      </section>
    </>
  );
}
