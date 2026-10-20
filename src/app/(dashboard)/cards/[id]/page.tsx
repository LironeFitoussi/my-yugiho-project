import type { Route } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CatalogAttribution,
  CatalogUnavailable,
  ClassicBadge,
  MarketPrice,
} from "@/features/catalog/components/catalog-bits";
import { PrintingsTable } from "@/features/catalog/components/printings-table";
import { isClassicCard } from "@/features/catalog/classic";
import { CardCollectionPanel } from "@/features/collection/components/card-collection-panel";
import { requireOwner } from "@/lib/auth";
import { getCard } from "@/lib/ygoprodeck";

export default async function CardDetailPage({ params }: PageProps<"/cards/[id]">) {
  await requireOwner();
  const { id: rawId } = await params;
  if (!/^\d{1,10}$/.test(rawId)) notFound();
  const id = Number(rawId);

  const result = await getCard(id);
  if (!result.ok) {
    if (result.error === "not_found") notFound();
    return (
      <>
        <PageHeader title={`Card ${id}`} />
        <CatalogUnavailable />
        <CatalogAttribution />
      </>
    );
  }

  const card = result.data;
  // Alternate-artwork ids resolve to the canonical card id — the card's single identity.
  if (card.id !== id) permanentRedirect(`/cards/${card.id}` as Route);

  const stats: [string, string | number | null][] = [
    ["Type", card.type],
    ["Attribute", card.attribute],
    [card.type.includes("Monster") ? "Monster type" : "Property", card.race],
    ["Archetype", card.archetype],
    [card.type.includes("XYZ") ? "Rank" : "Level", card.level],
    ["ATK", card.atk],
    ["DEF", card.def],
    ["Card ID", card.id],
  ];

  return (
    <>
      <PageHeader
        title={card.name}
        description={isClassicCard(card) ? <ClassicBadge /> : undefined}
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="relative mx-auto aspect-[59/86] w-full max-w-72 overflow-hidden rounded-lg bg-muted">
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              priority
              sizes="(min-width: 768px) 18rem, 80vw"
              className="object-contain"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">No image</span>
          )}
        </div>

        <div className="grid content-start gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {stats
              .filter(([, value]) => value !== null && value !== "")
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
          </dl>
          <p className="text-sm leading-relaxed whitespace-pre-line">{card.description}</p>
          <div className="text-sm">
            <span className="text-muted-foreground">General market price: </span>
            <MarketPrice price={card.marketPrice} />
          </div>
        </div>
      </div>

      <section className="mt-8">
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <CardCollectionPanel card={card} />
        </Suspense>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Printings</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Printing prices are per-printing market prices in USD; &ldquo;—&rdquo; means no price is available.
        </p>
        <PrintingsTable printings={card.printings} />
      </section>

      <CatalogAttribution />
    </>
  );
}
