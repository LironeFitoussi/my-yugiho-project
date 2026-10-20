import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllCopies } from "@/features/collection/queries";
import { listAllProducts } from "@/features/products/queries";
import { CurrencyTotals } from "@/features/purchases/components/currency-totals";
import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { PurchaseList } from "@/features/purchases/components/purchase-list";
import { listAllPurchases, listPurchases } from "@/features/purchases/queries";
import { purchasesTotalByCurrency, totalInvested } from "@/features/purchases/totals";
import { todayUtc } from "@/lib/aws/keys";
import { requireOwner } from "@/lib/auth";

export default async function PurchasesPage({ searchParams }: PageProps<"/purchases">) {
  await requireOwner();
  const { cursor } = await searchParams;
  const [page, allPurchases, copies, products] = await Promise.all([
    listPurchases(typeof cursor === "string" ? cursor : null),
    listAllPurchases(),
    listAllCopies(),
    listAllProducts(),
  ]);

  const invested = totalInvested({
    purchases: allPurchases,
    unlinkedCopies: copies.filter((c) => !c.purchaseId),
    unlinkedProducts: products.filter((p) => !p.purchaseId),
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Purchases" description="Purchase history, sellers and shipping." />

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <CurrencyTotals label="All purchases (subtotal + shipping)" totals={purchasesTotalByCurrency(allPurchases)} />
          <CurrencyTotals label="Total invested" totals={invested} />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Total invested adds the price of copies and products that aren&apos;t part of any purchase. Anything
            linked to a purchase is counted once, inside that purchase. USD and ILS are shown separately.
          </p>
        </CardContent>
      </Card>

      <details className="rounded-xl border p-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">New purchase</summary>
        <div className="mt-4">
          <PurchaseForm defaultDate={todayUtc()} />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <PurchaseList purchases={page.items} />
          <div className="flex gap-3">
            {cursor ? (
              <Link href="/purchases" className="inline-flex min-h-11 items-center underline underline-offset-4">
                First page
              </Link>
            ) : null}
            {page.cursor ? (
              <Link
                href={`/purchases?cursor=${encodeURIComponent(page.cursor)}`}
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                Next page
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
