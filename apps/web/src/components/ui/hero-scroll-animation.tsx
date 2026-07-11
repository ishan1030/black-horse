'use client';

import { useScroll, useTransform, motion, MotionConfig, MotionValue } from 'motion/react';
import Link from 'next/link';
import React, { useRef } from 'react';
import { mediaUrl } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { Shoe } from '@/components/shoe';

export interface HeroProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  imageAlt?: string;
}

interface SectionProps {
  scrollYProgress: MotionValue<number>;
}

/** Subtle blueprint grid, masked to fade toward the bottom. */
function GridBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
    />
  );
}

function HeroSection({ scrollYProgress }: SectionProps) {
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -4]);

  return (
    <motion.section
      style={{ scale, rotate }}
      className="sticky top-0 flex h-dvh flex-col items-center justify-center bg-gradient-to-t from-[#e6e6e6] to-neutral text-ink"
    >
      <GridBackdrop />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
          New Season · 2026 · Kathmandu
        </p>
        <h1 className="mt-6 font-display text-[clamp(44px,7vw,96px)] font-extrabold leading-[1.02] tracking-tight">
          Premium footwear,
          <br />
          crafted in Nepal.
        </h1>
        <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-muted md:text-[16.5px]">
          Timeless silhouettes built from full-grain leather and hand-finished by
          master craftsmen — 47 pairs of hands behind every pair.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          <Link
            href="#featured"
            className="rounded-xs bg-ink px-8 py-4 text-[13.5px] font-semibold tracking-wide text-white hover:bg-accent"
          >
            Shop the collection
          </Link>
          <Link
            href="#craft"
            className="rounded-xs border border-ink/30 px-8 py-4 text-[13.5px] font-semibold tracking-wide hover:border-ink"
          >
            Our craft
          </Link>
        </div>
      </div>

      {/* Scroll cue — SVG chevron, gently bobbing */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-8 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          />
        </svg>
      </motion.div>
    </motion.section>
  );
}

function CollectionSection({
  scrollYProgress,
  products,
}: SectionProps & { products: HeroProduct[] }) {
  const scale = useTransform(scrollYProgress, [0, 1], [0.82, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [4, 0]);

  return (
    <motion.section
      id="featured"
      style={{ scale, rotate }}
      className="relative h-dvh overflow-hidden bg-gradient-to-t from-[#0a0a0a] to-[#1e1e1e] text-white"
    >
      <GridBackdrop />
      <article className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 md:px-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(30px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-tight">
            The collection
          </h2>
          <span className="mb-1.5 hidden text-[13px] font-medium text-white/50 md:block">
            Hand-finished · Small batches
          </span>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:mt-12 lg:grid-cols-4">
            {products.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group relative overflow-hidden rounded-md bg-white/5"
              >
                <div className="relative aspect-square">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(p.imageUrl)}
                      alt={p.imageAlt ?? p.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Shoe tone="dark" className="w-[70%] opacity-70" />
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2 px-4 py-3.5">
                  <span className="truncate text-[13.5px] font-semibold">{p.name}</span>
                  <span className="text-[13px] font-medium text-white/60 tabular-nums">
                    {formatPrice(p.price)}
                  </span>
                </div>
                <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/10 group-hover:ring-white/40" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-12 max-w-[52ch]">
            <p className="font-display text-xl font-bold">The first drop is on its way.</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/60">
              Every pair is being finished by hand in our Kathmandu workshop. Join the
              list at the bottom of this page and be first to know.
            </p>
          </div>
        )}
      </article>
    </motion.section>
  );
}

/**
 * Scroll-linked two-panel hero: the light hero pins and recedes
 * (scale + rotate) while the dark collection panel rises over it.
 */
export default function HeroScrollAnimation({ products }: { products: HeroProduct[] }) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <MotionConfig reducedMotion="user">
      <div ref={container} className="relative h-[200vh] bg-ink">
        <HeroSection scrollYProgress={scrollYProgress} />
        <CollectionSection scrollYProgress={scrollYProgress} products={products} />
      </div>
    </MotionConfig>
  );
}
