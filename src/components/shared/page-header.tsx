import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-gold-gradient sm:text-3xl">{title}</h1>
        <div aria-hidden className="mt-1.5 h-px w-24 bg-linear-to-r from-gold/80 via-violet/50 to-transparent" />
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
