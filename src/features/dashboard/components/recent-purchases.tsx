import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRecentPurchases } from "@/features/purchases/queries";
import { purchaseTotal } from "@/features/purchases/totals";
import { formatMoney } from "@/lib/money";

export async function RecentPurchases() {
  const purchases = await listRecentPurchases(5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent purchases</CardTitle>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {purchases.map((p) => (
              <li key={p.purchaseId}>
                <Link
                  href={`/purchases/${p.purchaseId}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.seller}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.date} · {p.itemCount} {p.itemCount === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(purchaseTotal(p))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
