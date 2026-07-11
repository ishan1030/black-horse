/**
 * The Black Horse logomark: rearing horse inside an elliptical ring,
 * tail sweeping through it. Renders in currentColor for any surface.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path
          fillRule="evenodd"
          stroke="none"
          d="M100 10 C151 10 192 29 192 52 C192 75 151 94 100 94 C49 94 8 75 8 52 C8 29 49 10 100 10 Z M98 18 C141 18 175 32 175 50 C175 68 141 82 98 82 C55 82 21 68 21 50 C21 32 55 18 98 18 Z"
        />
        <circle cx="126" cy="48" r="15" />
        <ellipse cx="104" cy="48" rx="26" ry="13" transform="rotate(-10 104 48)" />
        <circle cx="84" cy="44" r="11" />
        <path d="M56 8 C70 10 82 20 90 34 L74 48 C68 32 60 20 48 16 Z" />
        <path d="M58 8 L38 15 C34 17 35 23 39 24 L54 25 L66 18 Z" />
        <path d="M56 10 L51 0 L62 7 Z" />
        <path d="M65 8 L70 0 L74 8 Z" />
        <path d="M78 46 L58 50 L40 44" fill="none" strokeWidth="9" />
        <path d="M86 54 L74 62 L66 72" fill="none" strokeWidth="9" />
        <path d="M130 56 L146 64 L162 60" fill="none" strokeWidth="9" />
        <path d="M124 62 L134 74 L144 82" fill="none" strokeWidth="9" />
        <path d="M138 38 C152 26 166 22 180 26 C172 32 164 36 158 42 C166 46 172 52 176 60 C164 58 152 52 144 48 C138 45 136 41 138 38 Z" />
      </g>
    </svg>
  );
}
