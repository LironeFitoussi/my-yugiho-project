import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { AttributeBadge } from "@/components/shared/attribute-badge";
import { OwnedTag } from "@/components/shared/owned-tag";
import { frameClass } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type { CardSummary } from "@/types";

import { ClassicBadge } from "./catalog-bits";

/** `ownedCounts`: cardId → copies owned (any printing), used only for the "Owned" tag. */
export function CardGrid({ cards, ownedCounts }: { cards: CardSummary[]; ownedCounts?: Record<number, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <CardTile card={card} owned={ownedCounts?.[card.id] ?? 0} />
        </li>
      ))}
    </ul>
  );
}

export function CardTile({ card, owned = 0 }: { card: CardSummary; owned?: number }) {
  return (
    <Link
      href={`/cards/${card.id}` as Route}
      className="group frame-gold flex h-full min-h-11 flex-col gap-2 rounded-xl p-2 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:glow-gold focus-visible:-translate-y-1 focus-visible:glow-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:hover:translate-y-0"
    >
      <div className={cn("rounded-md bg-linear-to-b p-[3px] shadow-md shadow-black/40", frameClass(null, card.type))}>
        <div className="relative aspect-[59/86] w-full overflow-hidden rounded-[3px] bg-muted">
          {card.imageUrlSmall ? (
            <Image
              src={card.imageUrlSmall}
              alt={card.name}
              fill
              sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, (min-width: 640px) 30vw, 45vw"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">No image</span>
          )}
          {owned > 0 ? <OwnedTag count={owned} className="absolute top-1 right-1" /> : null}
        </div>
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{card.name}</p>
        <p className="truncate text-xs text-muted-foreground">{card.type}</p>
        {card.attribute || card.isClassic ? (
          <div className="mt-1 flex flex-wrap gap-1">
            <AttributeBadge attribute={card.attribute} />
            {card.isClassic ? <ClassicBadge /> : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
