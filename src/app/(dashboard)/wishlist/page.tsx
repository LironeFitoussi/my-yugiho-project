import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllProducts } from "@/features/products/queries";
import { ProductWishForm } from "@/features/wishlist/components/product-wish-form";
import { WishlistFilters } from "@/features/wishlist/components/wishlist-filters";
import { WishlistList } from "@/features/wishlist/components/wishlist-list";
import { getWishlistView } from "@/features/wishlist/queries";
import { wishlistFiltersSchema } from "@/features/wishlist/schemas";
import { requireOwner } from "@/lib/auth";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function WishlistPage({ searchParams }: PageProps<"/wishlist">) {
  await requireOwner();
  const sp = await searchParams;
  const filters = wishlistFiltersSchema.parse({
    kind: first(sp.kind),
    status: first(sp.status),
    q: first(sp.q) ?? "",
  });
  const [view, products] = await Promise.all([getWishlistView(filters), listAllProducts()]);
  const productOptions = products.map(({ productId, name, category }) => ({ productId, name, category }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Wishlist"
        description={`${view.counts.wanted} wanted · ${view.counts.owned} owned · ${view.counts.cards} cards, ${view.counts.products} products`}
      />

      <p className="text-sm text-muted-foreground">
        Add cards from their page in the{" "}
        <Link href="/cards" className="inline-flex min-h-11 items-center underline underline-offset-4">
          card catalog
        </Link>
        . Card prices are general market estimates in USD; a card is &ldquo;owned&rdquo; once you have as many copies as
        you want.
      </p>

      <details className="rounded-xl border p-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Add a product wish</summary>
        <div className="mt-4">
          <ProductWishForm products={productOptions} />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <WishlistFilters filters={filters} />
          {view.catalogUnavailable ? (
            <p role="status" className="text-sm text-muted-foreground">
              The card catalog is unavailable right now — card prices show as unavailable.
            </p>
          ) : null}
          <WishlistList entries={view.entries} products={productOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
