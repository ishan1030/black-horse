/**
 * The Black Horse wordmark: stacked bold-italic "BLACK / HORSE".
 * Inherits color; size via font-size on the className.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`brandmark ${className ?? ''}`}>
      <span>BLACK</span>
      <span>HORSE</span>
    </span>
  );
}
