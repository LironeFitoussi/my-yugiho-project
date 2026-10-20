import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/types";

import { DeleteProductButton } from "./delete-product-button";
import { ProductForm } from "./product-form";

export function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">No products recorded yet.</p>;
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {products.map((p) => (
        <li key={p.productId}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words">{p.name}</span>
          <Badge variant={p.status === "sealed" ? "secondary" : "outline"}>
            {p.status === "sealed" ? "Sealed" : "Opened"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Category</dt>
          <dd>{p.category}</dd>
          <dt className="text-muted-foreground">Price</dt>
          <dd>{p.price ? formatMoney(p.price) : "—"}</dd>
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{p.shipping ? formatMoney(p.shipping) : "—"}</dd>
          <dt className="text-muted-foreground">Seller</dt>
          <dd>{p.seller ?? "—"}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{p.purchaseDate ?? "—"}</dd>
          <dt className="text-muted-foreground">Purchase</dt>
          <dd>
            {p.purchaseId ? (
              <Link
                href={`/purchases/${p.purchaseId}`}
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                View linked purchase
              </Link>
            ) : (
              "Not linked"
            )}
          </dd>
        </dl>
        {p.purchaseId ? (
          <p className="text-xs text-muted-foreground">
            Counted in its purchase — its own price is not added to your total invested again.
          </p>
        ) : null}
        {p.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{p.notes}</p> : null}
        <details className="rounded-lg border p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Edit</summary>
          <div className="mt-3 grid gap-4">
            <ProductForm product={p} />
            <DeleteProductButton productId={p.productId} disabled={p.purchaseId !== null} />
            {p.purchaseId ? (
              <p className="text-xs text-muted-foreground">Remove it from its purchase before deleting.</p>
            ) : null}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
