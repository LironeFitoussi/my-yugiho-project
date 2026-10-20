import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid } from "@/features/catalog/components/card-grid";
import { CardSearchForm } from "@/features/catalog/components/card-search-form";
import { CatalogAttribution, CatalogUnavailable } from "@/features/catalog/components/catalog-bits";
import { requireOwner } from "@/lib/auth";
import { searchCards } from "@/lib/ygoprodeck";

const firstString = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().optional());

const searchParamsSchema = z.object({
  q: firstString.transform((v) => (v ?? "").trim().slice(0, 100)),
  classic: firstString.transform((v) => v === "1"),
});

export default async function CardsPage({ searchParams }: PageProps<"/cards">) {
  await requireOwner();
  const { q, classic } = searchParamsSchema.parse(await searchParams);

  return (
    <>
      <PageHeader
        title="Card Catalog"
        description="Search the Yu-Gi-Oh! TCG catalog by name, card ID, passcode or set code."
      />
      <CardSearchForm q={q} classicOnly={classic} />
      <div className="mt-6">
        {q ? (
          <Suspense key={`${q}|${classic}`} fallback={<ResultsSkeleton />}>
            <SearchResults q={q} classicOnly={classic} />
          </Suspense>
        ) : (
          <p className="text-sm text-muted-foreground">
            Try a card name (&ldquo;Dark Magician&rdquo;), a passcode (&ldquo;46986414&rdquo;) or a printing code
            (&ldquo;LOB-005&rdquo;).
          </p>
        )}
      </div>
      <CatalogAttribution />
    </>
  );
}

async function SearchResults({ q, classicOnly }: { q: string; classicOnly: boolean }) {
  const result = await searchCards({ q, classicOnly, limit: 40 });
  if (!result.ok) return <CatalogUnavailable />;
  if (result.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No cards match &ldquo;{q}&rdquo;{classicOnly ? " in the classic Duel Monsters sets" : ""}.
      </p>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {result.data.length} result{result.data.length === 1 ? "" : "s"}
        {result.data.length === 40 ? " (showing the first 40 — refine your search)" : ""}
      </p>
      <CardGrid cards={result.data} />
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Searching" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="aspect-[59/86] w-full" />
      ))}
    </div>
  );
}
