import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { CatalogPrice } from "@/types";

export function ClassicBadge() {
  return (
    <Badge variant="secondary" title="Appears in a curated classic Duel Monsters set">
      Classic
    </Badge>
  );
}

export function CatalogAttribution() {
  return (
    <p className="mt-8 text-xs text-muted-foreground">
      Card data and images:{" "}
      <a
        href="https://ygoprodeck.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        YGOPRODeck
      </a>
    </p>
  );
}

export function CatalogUnavailable() {
  return (
    <div role="alert" className="rounded-lg border border-dashed p-6 text-sm">
      <p className="font-medium">Catalog unavailable</p>
      <p className="mt-1 text-muted-foreground">
        The card catalog (YGOPRODeck) couldn&apos;t be reached. Your collection is unaffected — try again in a moment.
      </p>
    </div>
  );
}

/** General card market price: always labelled Estimated, or Price Unavailable — never a made-up number. */
export function MarketPrice({ price }: { price: CatalogPrice | null }) {
  if (!price) return <span className="text-muted-foreground">Price Unavailable</span>;
  return (
    <span>
      <span className="font-medium">{formatMoney(price)}</span>{" "}
      <Badge variant="outline">Estimated</Badge>{" "}
      <span className="text-xs text-muted-foreground">via {price.source}</span>
    </span>
  );
}
