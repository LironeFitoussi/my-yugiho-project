import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CompletionBar } from "@/features/sets/components/completion-bar";
import { SetCardGrid } from "@/features/sets/components/set-card-grid";
import { getSetCompletion } from "@/features/sets/queries";
import { SET_FILTERS, setCodeSchema, setDetailParamsSchema, type SetFilter } from "@/features/sets/schemas";
import { requireOwner } from "@/lib/auth";

const FILTER_LABELS: Record<SetFilter, string> = { all: "All", owned: "Owned", missing: "Missing" };

export default async function SetDetailPage({ params, searchParams }: PageProps<"/sets/[id]">) {
  await requireOwner();
  const { id } = await params;
  const code = setCodeSchema.safeParse(id);
  if (!code.success) notFound();
  const { show } = setDetailParamsSchema.parse(await searchParams);

  const result = await getSetCompletion(code.data);
  if (!result.ok) {
    if (result.error === "not_found") notFound();
    return (
      <>
        <PageHeader title={code.data.toUpperCase()} />
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          The card catalog is unavailable right now. Please try again later.
        </p>
      </>
    );
  }

  const { set, cards, completion } = result;
  const owned = new Set(completion.ownedIds);
  const counts: Record<SetFilter, number> = { all: completion.total, owned: completion.owned, missing: completion.missing.length };
  const visible = cards.filter((c) => (show === "all" ? true : show === "owned" ? owned.has(c.id) : !owned.has(c.id)));
  const base = `/sets/${encodeURIComponent(set.code)}`;

  return (
    <>
      <PageHeader
        title={set.name}
        description={
          <>
            <span className="font-mono">{set.code}</span>
            {set.releaseDate ? ` · Released ${set.releaseDate}` : ""} · {set.cardCount} cards
          </>
        }
        actions={set.isClassic ? <Badge variant="secondary">Classic</Badge> : null}
      />

      <section className="mb-6 space-y-3 rounded-xl p-4 ring-1 ring-foreground/10" aria-label="Set completion">
        <CompletionBar completion={completion} size="lg" />
        <p className="text-sm text-muted-foreground">
          Completion counts unique cards regardless of printing — owning a card from another set or reprint counts.
          It does not mean you own this set&apos;s original printings.
        </p>
      </section>

      <nav aria-label="Filter cards" className="mb-4 flex gap-2">
        {SET_FILTERS.map((f) => (
          <Link
            key={f}
            href={(f === "all" ? base : `${base}?show=${f}`) as Route}
            aria-current={show === f ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ring-1 ring-foreground/10",
              show === f ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {FILTER_LABELS[f]} ({counts[f]})
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {show === "owned" ? "You don't own any cards from this set yet." : show === "missing" ? "You own every card in this set." : "This set has no cards."}
        </p>
      ) : (
        <SetCardGrid cards={visible} owned={owned} />
      )}
    </>
  );
}
