import Link from 'next/link';
import HeroScrollAnimation, { type HeroProduct } from '@/components/ui/hero-scroll-animation';
import { ProductCard } from '@/components/product-card';
import { Shoe } from '@/components/shoe';
import { getCategories, getFeaturedProducts, getShopProducts, mediaUrl } from '@/lib/api';

const MARQUEE_ITEMS = [
  'Crafted in Kathmandu',
  'Full-grain leather',
  '47 pairs of hands',
  '6-month warranty',
];

const CRAFT_STATS = [
  { value: '47', label: 'pairs of hands' },
  { value: '72h', label: 'of finishing' },
  { value: '6 mo', label: 'craft warranty' },
];

export default async function HomePage() {
  const [products, categories, catalog] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getShopProducts(),
  ]);

  // A random real product photo per category (re-rolled each revalidation).
  const photosByCategory = new Map<string, string[]>();
  for (const p of catalog) {
    if (!p.images[0]) continue;
    const list = photosByCategory.get(p.categorySlug) ?? [];
    list.push(p.images[0].url);
    photosByCategory.set(p.categorySlug, list);
  }
  const categoryPhoto = (slug: string): string | null => {
    const list = photosByCategory.get(slug);
    return list?.length ? list[Math.floor(Math.random() * list.length)] : null;
  };

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
          <Link href="/products" className="text-[13.5px] font-medium underline-offset-4 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {categories.slice(0, 3).map((cat) => {
            const photo = categoryPhoto(cat.slug);
            return (
              <Link
                key={cat.id}
                href={`/products?type=${cat.slug}`}
                className="group relative flex aspect-[421/380] flex-col justify-between overflow-hidden bg-neutral p-8 pt-10"
              >
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(photo)}
                      alt={cat.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-450 ease-out group-hover:scale-[1.04]"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 to-transparent"
                    />
                  </>
                ) : (
                  <Shoe className="m-auto w-[64%] transition-transform duration-450 ease-out group-hover:scale-105 group-hover:-rotate-2" />
                )}
                <div className={`relative mt-auto flex items-end justify-between ${photo ? 'text-white' : ''}`}>
                  <div>
                    <h3 className="font-display text-lg font-bold">{cat.name}</h3>
                    <small className={`text-[12.5px] ${photo ? 'text-white/75' : 'text-muted'}`}>
                      {cat.productCount > 0 ? `${cat.productCount} styles` : 'Explore'}
                    </small>
                  </div>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${
                      photo
                        ? 'border-white/70 group-hover:bg-white group-hover:text-ink'
                        : 'border-ink group-hover:bg-ink group-hover:text-white'
                    }`}
                  >
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      )}

      {/* The full collection — every product, revealed as you scroll */}
      {catalog.length > 0 && (
        <section aria-labelledby="collection-h" className="px-5 pb-20 md:px-16 md:pb-28" style={{ paddingTop: 0 }}>
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="collection-h" className="font-display text-[clamp(26px,3vw,34px)] font-extrabold tracking-tight">
              The collection
            </h2>
            <span className="text-[13.5px] font-medium text-muted">
              {catalog.length} styles · all hand-finished
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {catalog.map((p) => (
              <ProductCard key={p.id} product={p} />
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
        <Link href="/about" className="text-[13.5px] font-medium underline underline-offset-6">
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
