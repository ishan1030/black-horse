/** The brand's abstract shoe silhouette, used as an image placeholder. */
export function Shoe({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const [upper, sole, laces] =
    tone === 'dark'
      ? ['#2E2E2E', '#1F1F1F', '#4A4A4A']
      : ['#CFCFCF', '#BABABA', '#E3E3E3'];
  return (
    <svg viewBox="0 0 560 260" fill="none" className={className} aria-hidden="true">
      <path
        d="M30 210 C40 160 90 140 140 130 C195 118 240 88 275 58 C295 41 313 36 330 48 C365 74 420 108 470 122 C510 133 535 152 538 185 C540 202 528 212 505 214 L60 220 C40 220 26 218 30 210 Z"
        fill={upper}
      />
      <path
        d="M28 216 L540 208 C544 222 536 232 516 233 L58 238 C38 238 24 230 28 216 Z"
        fill={sole}
      />
      <path
        d="M180 122 L215 152 M215 108 L250 140 M250 92 L285 126"
        stroke={laces}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The Black Horse wordmark: stacked bold-italic "BLACK / HORSE".
 * Inherits color from its parent; size with a text-size class.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-col font-display font-extrabold uppercase italic leading-[0.88] tracking-[0.015em] ${className}`}
    >
      <span>Black</span>
      <span>Horse</span>
    </span>
  );
}
