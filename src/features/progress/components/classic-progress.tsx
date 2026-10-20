import type { Route } from "next";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { getClassicProgress } from "../queries";

const NOTE = "Unique cards from any printing — duplicates count once.";
const fmt = new Intl.NumberFormat("en-US");

/** Overall progress toward the classic Duel Monsters card pool. `hero` for the dashboard, `bar` for page headers. */
export async function ClassicProgress({ variant }: { variant: "hero" | "bar" }) {
  const progress = await getClassicProgress();

  if (!progress.ok) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Overall classic progress is unavailable while the card catalog can&apos;t be reached.
      </p>
    );
  }

  const { owned, total, percent, setCount } = progress;
  const label = `${fmt.format(owned)} of ${fmt.format(total)} classic Duel Monsters cards (${percent}%)`;

  if (variant === "bar") {
    return (
      <Link
        href={"/sets?classic=1" as Route}
        className="frame-gold block rounded-xl p-3 transition-colors hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-display text-sm font-semibold tracking-wide text-gold">Classic collection</span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold">{fmt.format(owned)}</span>
            <span className="text-muted-foreground"> / {fmt.format(total)} · {percent}%</span>
          </span>
        </div>
        <Progress value={percent} aria-label={`${label}. ${NOTE}`} />
      </Link>
    );
  }

  // Hero: progress ring + headline numbers.
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(percent, 100) / 100) * circumference;

  return (
    <section
      aria-labelledby="classic-progress-title"
      className="frame-gold relative overflow-hidden rounded-2xl p-5 sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.14_85/0.18),transparent)]"
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <svg viewBox="0 0 120 120" className="size-32 shrink-0 -rotate-90 sm:size-36" role="img" aria-label={label}>
          <defs>
            <linearGradient id="classic-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--gold)" />
              <stop offset="100%" stopColor="var(--gold-deep)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="url(#classic-ring)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="drop-shadow-[0_0_6px_oklch(0.82_0.14_85/0.5)]"
          />
          <text
            x="60"
            y="60"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 60 60)"
            className="fill-foreground font-display text-[22px] font-bold"
          >
            {percent}%
          </text>
        </svg>
        <div className="min-w-0 text-center sm:text-left">
          <h2 id="classic-progress-title" className="font-display text-lg font-semibold tracking-wide text-gold-gradient">
            Duel Monsters Collection
          </h2>
          <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">
            {fmt.format(owned)}
            <span className="text-lg font-normal text-muted-foreground"> / {fmt.format(total)} cards</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {NOTE} Across {setCount} classic sets.
          </p>
          <Link
            href={"/sets?classic=1" as Route}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-gold underline-offset-4 hover:underline"
          >
            Browse classic sets →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ClassicProgressSkeleton({ variant }: { variant: "hero" | "bar" }) {
  return variant === "hero" ? (
    <Skeleton className="h-44 w-full rounded-2xl" />
  ) : (
    <Skeleton className="h-16 w-full rounded-xl" />
  );
}
