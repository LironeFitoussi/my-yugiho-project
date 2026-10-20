import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";

import { OwnedTag } from "@/components/shared/owned-tag";
import { frameClass } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
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
              className="group flex min-h-11 flex-col gap-1.5 rounded-lg p-1.5 transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:hover:translate-y-0"
            >
              <div
                className={cn(
                  "rounded-md bg-linear-to-b p-[2px] shadow-md shadow-black/40 transition-shadow duration-200 group-hover:glow-gold group-focus-visible:glow-gold group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                  isOwned ? frameClass(null, card.type) : "from-zinc-600 to-zinc-800",
                )}
              >
                <div className="relative aspect-[59/86] w-full overflow-hidden rounded-[3px] bg-muted">
                  {card.imageUrlSmall ? (
                    <Image
                      src={card.imageUrlSmall}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 16vw, 33vw"
                      className={isOwned ? "object-cover" : "object-cover opacity-50 grayscale"}
                    />
                  ) : null}
                  {isOwned ? <OwnedTag decorative className="absolute top-1 right-1" /> : null}
                </div>
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
