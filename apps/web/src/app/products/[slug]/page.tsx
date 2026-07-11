import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PdpActions } from '@/components/pdp-actions';
import { ProductCard } from '@/components/product-card';
import { Shoe } from '@/components/shoe';
import { getFeaturedProducts, getProductBySlug, mediaUrl } from '@/lib/api';

function detailSections(material: string): Array<{ title: string; body: React.ReactNode; open?: boolean }> {
  return [
    {
      title: 'Details',
      open: true,
      body: (
        <ul className="list-disc space-y-1 pl-4.5">
          <li>{material || 'Premium'} upper, selected and cut by hand</li>
          <li>Stitched construction — built to be resoled, not replaced</li>
          <li>Cushioned leather insole</li>
          <li>Finished in our Kathmandu workshop</li>
        </ul>
      ),
    },
    {
      title: 'Materials & care',
      body: 'Wipe with a soft damp cloth and let it dry away from direct heat. Condition the leather monthly. Every pair carries a 2-year craft warranty.',
    },
    {
      title: 'Shipping & returns',
      body: 'Free delivery across Kathmandu Valley within 48 hours; 3–5 days nationwide. Unworn pairs can be returned or exchanged within 7 days.',
    },
  ];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (await getFeaturedProducts())
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <>
      <div className="px-5 pt-5 text-[12.5px] text-muted md:px-16">
        <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
          Home
        </Link>
        &nbsp;&nbsp;/&nbsp;&nbsp;
        <span>{product.categoryName}</span>
        &nbsp;&nbsp;/&nbsp;&nbsp;
        <b className="font-medium text-ink">{product.name}</b>
      </div>

      <div className="grid items-start gap-8 px-5 py-7 pb-22 md:grid-cols-[7fr_5fr] md:gap-18 md:px-16">
        {/* Gallery */}
        <div className="md:sticky md:top-24">
          <div className="relative grid aspect-[4/3.1] place-items-center overflow-hidden bg-neutral">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(product.images[0].url)}
                alt={product.images[0].alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Shoe tone="dark" className="w-[70%]" />
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => {
              const img = product.images[i];
              return (
                <button
                  key={i}
                  aria-label={`View ${i + 1}`}
                  className={`relative grid aspect-square place-items-center overflow-hidden bg-neutral transition-colors ${
                    i === 0 ? 'border border-ink' : 'border border-transparent hover:border-muted'
                  }`}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(img.url)}
                      alt={img.alt}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Shoe className="w-[66%]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-muted">
            {product.categoryName} · {product.material}
          </p>
          <h1 className="mb-2 mt-2.5 font-display text-[clamp(28px,3vw,38px)] font-extrabold tracking-tight">
            {product.name}
          </h1>

          <PdpActions product={product} />

          <div className="mt-8 border-t border-line">
            {detailSections(product.material).map((section) => (
              <details key={section.title} open={section.open} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4.5 text-[13.5px] font-semibold after:text-lg after:font-normal after:text-muted after:content-['+'] group-open:after:content-['–']">
                  {section.title}
                </summary>
                <div className="max-w-[56ch] pb-5 text-[13.5px] leading-relaxed text-muted">
                  {section.body}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-5 pb-24 md:px-16">
          <div className="mb-9 flex items-end justify-between">
            <h2 className="font-display text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-tight">
              Complete the look
            </h2>
            <Link href="/#featured" className="text-[13.5px] font-medium underline-offset-4 hover:underline">
              Shop all products →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
