import Link from 'next/link';
import { mediaUrl } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Shoe } from './shoe';

export function ProductCard({ product }: { product: Product }) {
  const price = product.variants[0]?.price ?? 0;
  const photo = product.images[0];

  return (
    <article className="group flex flex-col gap-3.5">
      <Link
        href={`/products/${product.slug}`}
        className="relative grid aspect-square place-items-center overflow-hidden bg-neutral"
      >
        {product.isNew && (
          <span className="absolute left-3.5 top-3.5 z-10 bg-ink px-2.5 py-1.5 text-[9.5px] font-semibold tracking-[0.12em] text-white">
            NEW
          </span>
        )}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(photo.url)}
            alt={photo.alt}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <Shoe className="w-[64%] transition-transform duration-400 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-3" />
        )}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-ink py-3 text-center text-[12.5px] font-semibold tracking-wide text-white transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
          View product
        </span>
      </Link>
      <div>
        <div className="flex justify-between gap-3 text-[14.5px]">
          <span className="font-medium">{product.name}</span>
          <span className="font-semibold tabular-nums">{formatPrice(price)}</span>
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted">
          {product.categoryName} · {product.material}
        </div>
      </div>
    </article>
  );
}
