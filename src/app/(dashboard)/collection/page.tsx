import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { ClassicProgress, ClassicProgressSkeleton } from "@/features/progress/components/classic-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollectionGrid, CollectionGridWithArt } from "@/features/collection/components/collection-grid";
import { listAllCopies } from "@/features/collection/queries";
import { collectionFiltersSchema } from "@/features/collection/schemas";
import { requireOwner } from "@/lib/auth";
import { CONDITIONS, type CardCopy } from "@/types";

type CardGroup = { cardId: number; cardName: string; copies: CardCopy[] };

function groupByCard(copies: CardCopy[]): CardGroup[] {
  const groups = new Map<number, CardGroup>();
  for (const copy of copies) {
    const group = groups.get(copy.cardId) ?? { cardId: copy.cardId, cardName: copy.cardName, copies: [] };
    group.copies.push(copy);
    groups.set(copy.cardId, group);
  }
  return [...groups.values()].sort((a, b) => a.cardName.localeCompare(b.cardName));
}

// Names and counts come from DynamoDB (denormalized cardName); card art streams in from the
// catalog and is simply absent while the catalog API is down.
export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
  await requireOwner();
  const raw = await searchParams;
  const filters = collectionFiltersSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    condition: typeof raw.condition === "string" && raw.condition !== "" ? raw.condition : undefined,
  });

  const copies = await listAllCopies();
  const allGroups = groupByCard(copies);
  const uniqueCards = allGroups.length; // completion counts unique card IDs, never copies

  const needle = filters.q.toLowerCase();
  const groups = allGroups
    .filter((g) => !needle || g.cardName.toLowerCase().includes(needle))
    .map((g) => ({ ...g, copies: filters.condition ? g.copies.filter((c) => c.condition === filters.condition) : g.copies }))
    .filter((g) => g.copies.length > 0);
  const isFiltered = Boolean(needle || filters.condition);
  const items = groups.map((g) => ({ cardId: g.cardId, cardName: g.cardName, copyCount: g.copies.length }));

  return (
    <>
      <PageHeader title="Collection" description="Every card you own. Tap one to manage its copies." />
      <div className="mb-6">
        <Suspense fallback={<ClassicProgressSkeleton variant="bar" />}>
          <ClassicProgress variant="bar" />
        </Suspense>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 ring-1 ring-foreground/10">
          <dt className="text-sm text-muted-foreground">Unique cards</dt>
          <dd className="text-2xl font-semibold">{uniqueCards}</dd>
        </div>
        <div className="rounded-xl p-4 ring-1 ring-foreground/10">
          <dt className="text-sm text-muted-foreground">Total copies</dt>
          <dd className="text-2xl font-semibold">{copies.length}</dd>
        </div>
      </dl>

      {copies.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Your collection is empty.</p>
          <Button render={<Link href="/cards" />} nativeButton={false} className="h-11 px-4">
            Find a card to add
          </Button>
        </div>
      ) : (
        <>
          <Form action="/collection" className="mb-4 flex flex-wrap gap-2" role="search">
            <label htmlFor="q" className="sr-only">
              Filter by card name
            </label>
            <Input
              id="q"
              name="q"
              type="search"
              placeholder="Filter by name"
              defaultValue={filters.q}
              className="h-11 min-w-0 flex-1 basis-48"
            />
            <label htmlFor="condition" className="sr-only">
              Filter by condition
            </label>
            <select
              id="condition"
              name="condition"
              defaultValue={filters.condition ?? ""}
              className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30"
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button type="submit" className="h-11 px-4">
              Filter
            </Button>
            {isFiltered ? (
              <Button render={<Link href="/collection" />} nativeButton={false} variant="ghost" className="h-11 px-4">
                Clear
              </Button>
            ) : null}
          </Form>

          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No copies match these filters.
            </p>
          ) : (
            <Suspense fallback={<CollectionGrid items={items} />}>
              <CollectionGridWithArt items={items} />
            </Suspense>
          )}
        </>
      )}
    </>
  );
}
