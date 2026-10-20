/**
 * Fixed, decorative "Shadow Realm" ambience behind the dashboard: a violet
 * radial glow plus a faint gold arcane circle (concentric rings, a hexagram
 * and tick marks). Original geometry; purely presentational.
 */
const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);
const NODES = Array.from({ length: 6 }, (_, i) => i * 60);

export function ArcaneBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--arcane)_45%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_100%,color-mix(in_oklch,var(--gold)_10%,transparent),transparent_70%)]" />
      <svg
        viewBox="-100 -100 200 200"
        fill="none"
        stroke="currentColor"
        className="absolute top-1/2 left-1/2 size-[min(140vw,58rem)] -translate-x-1/2 -translate-y-1/2 text-gold opacity-[0.06] md:left-[calc(50%+7rem)]"
      >
        <circle r="96" strokeWidth="0.6" />
        <circle r="90" strokeWidth="0.3" />
        <circle r="62" strokeWidth="0.5" />
        <circle r="30" strokeWidth="0.4" />
        {TICKS.map((deg) => (
          <line key={deg} x1="0" y1="-90" x2="0" y2={deg % 30 === 0 ? -84 : -87} strokeWidth="0.4" transform={`rotate(${deg})`} />
        ))}
        <polygon points="0,-90 77.94,45 -77.94,45" strokeWidth="0.6" />
        <polygon points="0,90 77.94,-45 -77.94,-45" strokeWidth="0.6" />
        {NODES.map((deg) => (
          <circle key={deg} cx="0" cy="-90" r="3" strokeWidth="0.5" transform={`rotate(${deg})`} />
        ))}
        <polygon points="0,-30 25.98,15 -25.98,15" strokeWidth="0.4" />
      </svg>
    </div>
  );
}
