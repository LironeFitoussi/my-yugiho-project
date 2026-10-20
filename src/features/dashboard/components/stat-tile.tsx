import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  href?: Route;
}) {
  const body = (
    <>
      <p className="font-display text-[11px] font-semibold tracking-wider text-gold/90 uppercase">{label}</p>
      <div className="mt-1 text-xl font-semibold tabular-nums break-words sm:text-2xl">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </>
  );
  const className = "frame-gold block min-h-11 rounded-xl p-3 shadow-lg shadow-black/25 sm:p-4";
  return href ? (
    <Link
      href={href}
      className={`${className} transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:glow-gold hover:[--frame-fill:var(--muted)] focus-visible:glow-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function TilesSkeleton({ count }: { count: number }) {
  return (
    <TileGrid>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl border border-gold/10" />
      ))}
    </TileGrid>
  );
}

export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-2 rounded-xl border bg-card/60 p-4">
      <Skeleton className="h-5 w-40 rounded-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
