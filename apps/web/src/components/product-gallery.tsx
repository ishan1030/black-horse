'use client';

import { useState } from 'react';
import { Shoe } from './shoe';

/** PDP image gallery: thumbnails switch the main image (angles of the shoe). */
export function ProductGallery({
  images,
}: {
  images: Array<{ url: string; alt: string }>;
}) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  return (
    <div className="md:sticky md:top-24">
      <div className="relative grid aspect-[4/3.1] place-items-center overflow-hidden bg-neutral">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.alt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Shoe tone="dark" className="w-[70%]" />
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => {
          const img = images[i];
          return (
            <button
              key={i}
              aria-label={`View ${i + 1}`}
              onClick={() => img && setSelected(i)}
              className={`relative grid aspect-square place-items-center overflow-hidden bg-neutral transition-colors ${
                i === selected ? 'border border-ink' : 'border border-transparent hover:border-muted'
              } ${img ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
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
  );
}
