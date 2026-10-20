import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWishlistCounts } from "@/features/wishlist/queries";

export async function WishlistSummary() {
  const counts = await getWishlistCounts();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wishlist</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Wanted</dt>
            <dd className="text-xl font-semibold tabular-nums">{counts.wanted}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Owned</dt>
            <dd className="text-xl font-semibold tabular-nums">{counts.owned}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {counts.cards} cards · {counts.products} products
        </p>
        <Link
          href="/wishlist?status=wanted"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          View wanted items
        </Link>
      </CardContent>
    </Card>
  );
}
