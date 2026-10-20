import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { OwnedTag } from "@/components/shared/owned-tag";
import { getCollectionArt, type CollectionArt } from "@/features/collection/queries";
import { frameClass } from "@/lib/card-frame";
import { cn } from "@/lib/utils";

export type CollectionGridItem = { cardId: number; cardName: string; copyCount: number };

/** Art from the catalog; tiles whose card the catalog can't return keep the name-only placeholder. */
export async function CollectionGridWithArt({ items }: { items: CollectionGridItem[] }) {
  const art = await getCollectionArt(items.map((i) => i.cardId));
  return <CollectionGrid items={items} art={art} />;
}

/** Renders from DynamoDB data alone when `art` is omitted (Suspense fallback / catalog down). */
export function CollectionGrid({ items, art }: { items: CollectionGridItem[]; art?: Map<number, CollectionArt> }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
      {items.map((item) => {
        const card = art?.get(item.cardId);
        return (
          <li key={item.cardId}>
            <Link
              href={`/cards/${item.cardId}` as Route}
              className="group flex min-h-11 flex-col gap-1.5 rounded-lg p-1 transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:hover:translate-y-0"
            >
              <div
                className={cn(
                  "rounded-md bg-linear-to-b p-[2px] shadow-md shadow-black/40 transition-shadow duration-200 group-hover:glow-gold group-focus-visible:glow-gold group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                  frameClass(card?.frameType, card?.type),
                )}
              >
                <div className="relative aspect-[59/86] w-full overflow-hidden rounded-[3px] bg-muted">
                  {card?.imageUrlSmall ? (
                    <Image
                      src={card.imageUrlSmall}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center p-2 text-center text-[11px] leading-tight text-muted-foreground">
                      {item.cardName}
                    </span>
                  )}
                  <OwnedTag count={item.copyCount} decorative className="absolute top-1 right-1" />
                </div>
              </div>
              <span className="line-clamp-2 text-xs font-medium">{item.cardName}</span>
              <span className="sr-only">
                {item.copyCount} {item.copyCount === 1 ? "copy" : "copies"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
