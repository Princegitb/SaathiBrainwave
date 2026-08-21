/**
 * SkeletonCard — shimmer placeholder used while async data loads.
 * Stacks naturally inside any card grid.
 */
export default function SkeletonCard({ height = 120, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width: '100%' }}
      aria-hidden="true"
    />
  );
}