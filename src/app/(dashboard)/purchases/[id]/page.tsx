import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllCopies } from "@/features/collection/queries";
import { listAllProducts } from "@/features/products/queries";
import { AddItemForm } from "@/features/purchases/components/add-item-form";
import { DeletePurchaseButton, RemoveItemButton } from "@/features/purchases/components/item-buttons";
import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { getPurchaseWithItems } from "@/features/purchases/queries";
import { purchaseTotal } from "@/features/purchases/totals";
import { requireOwner } from "@/lib/auth";
import { formatMoney } from "@/lib/money";

const KIND_LABEL = { COPY: "Card copy", PRODUCT: "Product", MISC: "Other" } as const;

export default async function PurchaseDetailPage({ params }: PageProps<"/purchases/[id]">) {
  await requireOwner();
  const { id } = await params;
  const [data, copies, products] = await Promise.all([getPurchaseWithItems(id), listAllCopies(), listAllProducts()]);
  if (!data) notFound();
  const { purchase, items } = data;
  const cur = (amountMinor: number) => formatMoney({ amountMinor, currency: purchase.currency });

  // Only things not already in any purchase can be added — one purchase per copy/product.
  const copyOptions = copies
    .filter((c) => !c.purchaseId)
    .sort((a, b) => a.cardName.localeCompare(b.cardName))
    .map((c) => ({
      value: `${c.cardId}:${c.copyId}`,
      label: [
        c.cardName,
        c.printingSetCode,
        c.condition,
        c.purchasePrice ? formatMoney(c.purchasePrice) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const productOptions = products
    .filter((p) => !p.purchaseId)
    .map((p) => ({
      value: p.productId,
      label: [p.name, p.category, p.price ? formatMoney(p.price) : null].filter(Boolean).join(" · "),
    }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={purchase.seller}
        description={`${purchase.date} · ${purchase.currency}`}
        actions={
          <Link href="/purchases" className="inline-flex min-h-11 items-center underline underline-offset-4">
            All purchases
          </Link>
        }
      />

      <Card>
        <CardContent>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-xs text-muted-foreground">Subtotal</dt>
              <dd className="text-lg font-semibold tabular-nums">{cur(purchase.subtotalMinor)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Shipping</dt>
              <dd className="text-lg font-semibold tabular-nums">{cur(purchase.shippingMinor)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatMoney(purchaseTotal(purchase))}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({purchase.itemCount})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={`${item.kind}-${item.refId}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.kind === "COPY" && item.cardId ? (
                        <Link href={`/cards/${item.cardId}`} className="underline underline-offset-4">
                          {item.description}
                        </Link>
                      ) : (
                        item.description
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[item.kind]} · <span className="tabular-nums">{formatMoney(item.amount)}</span>
                    </p>
                  </div>
                  <RemoveItemButton purchaseId={purchase.purchaseId} kind={item.kind} refId={item.refId} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Linking a copy or product only records what you paid for it. Buying a product never adds its cards to
            your collection — add copies manually from the card page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add an item</CardTitle>
        </CardHeader>
        <CardContent>
          <AddItemForm
            purchaseId={purchase.purchaseId}
            currency={purchase.currency}
            copyOptions={copyOptions}
            productOptions={productOptions}
            initialToken={crypto.randomUUID()}
          />
        </CardContent>
      </Card>

      <details className="rounded-xl border p-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Edit purchase</summary>
        <div className="mt-4 grid gap-6">
          <PurchaseForm purchase={purchase} />
          <div className="grid gap-1">
            <DeletePurchaseButton purchaseId={purchase.purchaseId} disabled={purchase.itemCount > 0} />
            {purchase.itemCount > 0 ? (
              <p className="text-xs text-muted-foreground">Remove all items before deleting this purchase.</p>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}
