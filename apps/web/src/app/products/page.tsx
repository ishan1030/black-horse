import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getCategories, getShopProducts } from '@/lib/api';

export const metadata = { title: 'Shop' };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const [categories, products] = await Promise.all([getCategories(), getShopProducts(type)]);
  const active = categories.find((c) => c.slug === type);

  return (
    <div className="px-5 py-12 md:px-16 md:py-16">
      <div className="mb-8">
        <h1 className="font-display text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-tight">
          {active ? active.name : 'Shop all'}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          {products.length} style{products.length === 1 ? '' : 's'} · hand-finished in Kathmandu
        </p>
      </div>

      <div className="mb-10 flex flex-wrap gap-2.5">
        <Link
          href="/products"
          className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
            !active ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?type=${c.slug}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              active?.id === c.id ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-24 text-center text-[14.5px] text-muted">
          Nothing here yet — our first drop for this category is on its way.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
