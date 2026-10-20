import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PriceLabel } from "@/features/pricing/components/price-label";
import type { Product } from "@/types";

import type { CardWishEntry, ProductWishEntry, WishlistEntry } from "../view";
import { CardWishForm } from "./card-wish-form";
import { ProductWishForm } from "./product-wish-form";
import { RemoveWishButton } from "./remove-wish-button";

type ProductOption = Pick<Product, "productId" | "name" | "category">;

export function WishlistList({ entries, products }: { entries: WishlistEntry[]; products: ProductOption[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on your wishlist matches.</p>;
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {entries.map((e) => (
        <li key={e.kind === "CARD" ? `c-${e.item.cardId}` : `p-${e.item.wishId}`}>
          {e.kind === "CARD" ? <CardWishRow entry={e} /> : <ProductWishRow entry={e} products={products} />}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: "wanted" | "owned" }) {
  return status === "owned" ? <Badge>Owned</Badge> : <Badge variant="outline">Wanted</Badge>;
}

function CardWishRow({ entry }: { entry: CardWishEntry }) {
  const { item } = entry;
  return (
    <Card>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex gap-3">
          <div className="relative aspect-59/86 w-14 shrink-0 overflow-hidden rounded bg-muted">
            {entry.imageUrlSmall ? (
              <Image src={entry.imageUrlSmall} alt="" fill sizes="56px" className="object-contain" />
            ) : null}
          </div>
          <div className="grid min-w-0 flex-1 content-start gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/cards/${item.cardId}`}
                className="inline-flex min-h-11 items-center font-medium break-words underline-offset-4 hover:underline"
              >
                {item.cardName}
              </Link>
              <StatusBadge status={entry.status} />
            </div>
            <p className="tabular-nums">
              Own {entry.ownedCount} / want {item.desiredQuantity}
            </p>
            <p className="text-muted-foreground">
              Est. price: {entry.quote ? <PriceLabel quote={entry.quote} /> : "Price Unavailable"}
            </p>
          </div>
        </div>
        {item.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{item.notes}</p> : null}
        <details className="rounded-lg border p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Edit</summary>
          <div className="mt-3 grid gap-3">
            <CardWishForm cardId={item.cardId} desiredQuantity={item.desiredQuantity} notes={item.notes} />
            <RemoveWishButton kind="CARD" id={item.cardId} label={item.cardName} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function ProductWishRow({ entry, products }: { entry: ProductWishEntry; products: ProductOption[] }) {
  const { item } = entry;
  return (
    <Card>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words">{item.name}</span>
          <StatusBadge status={entry.status} />
        </div>
        <p className="text-muted-foreground">
          {item.category}
          {item.setCode ? ` · ${item.setCode}` : ""}
        </p>
        {entry.fulfilledBy ? (
          <p>
            Fulfilled by{" "}
            <Link href="/products" className="inline-flex min-h-11 items-center underline underline-offset-4">
              {entry.fulfilledBy.name}
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Not owned yet. Product prices aren&apos;t tracked — sealed products have no reliable price source.
          </p>
        )}
        {item.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{item.notes}</p> : null}
        <details className="rounded-lg border p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Edit</summary>
          <div className="mt-3 grid gap-3">
            <ProductWishForm wish={item} products={products} />
            <RemoveWishButton kind="PRODUCT" id={item.wishId} label={item.name} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
