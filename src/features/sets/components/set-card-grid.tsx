import { Check } from "lucide-react";
import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";

import type { CardSummary } from "@/types";

export function SetCardGrid({ cards, owned }: { cards: CardSummary[]; owned: Set<number> }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {cards.map((card) => {
        const isOwned = owned.has(card.id);
        return (
          <li key={card.id}>
            <Link
              href={`/cards/${card.id}` as Route}
              className="group flex min-h-11 flex-col gap-1.5 rounded-lg p-1.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="relative aspect-[59/86] w-full overflow-hidden rounded-md bg-muted">
                {card.imageUrlSmall ? (
                  <Image
                    src={card.imageUrlSmall}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 16vw, 33vw"
                    className={isOwned ? "object-cover" : "object-cover opacity-50 grayscale"}
                  />
                ) : null}
                {isOwned ? (
                  <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : null}
              </div>
              <span className="line-clamp-2 text-xs font-medium">{card.name}</span>
              <span className="sr-only">{isOwned ? "Owned" : "Missing"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
