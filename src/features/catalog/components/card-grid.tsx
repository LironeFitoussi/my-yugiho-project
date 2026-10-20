import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { CardSummary } from "@/types";

import { ClassicBadge } from "./catalog-bits";

export function CardGrid({ cards }: { cards: CardSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <CardTile card={card} />
        </li>
      ))}
    </ul>
  );
}

export function CardTile({ card }: { card: CardSummary }) {
  return (
    <Link
      href={`/cards/${card.id}` as Route}
      className="flex h-full min-h-11 flex-col gap-2 rounded-lg border p-2 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[59/86] w-full overflow-hidden rounded bg-muted">
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
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{card.name}</p>
        <p className="truncate text-xs text-muted-foreground">{card.type}</p>
        {card.isClassic ? (
          <div className="mt-1">
            <ClassicBadge />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
