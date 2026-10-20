import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { Purchase } from "@/types";

import { purchaseTotal } from "../totals";

const money = (p: Purchase, amountMinor: number) => formatMoney({ amountMinor, currency: p.currency });

export function PurchaseList({ purchases }: { purchases: Purchase[] }) {
  if (purchases.length === 0) {
    return <p className="text-sm text-muted-foreground">No purchases recorded yet.</p>;
  }
  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="grid gap-2 md:hidden">
        {purchases.map((p) => (
          <li key={p.purchaseId}>
            <Link
              href={`/purchases/${p.purchaseId}`}
              className="grid min-h-11 gap-1 rounded-lg border p-3 hover:bg-muted"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{p.seller}</span>
                <span className="font-semibold tabular-nums">{formatMoney(purchaseTotal(p))}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                <span>
                  {p.date} · {p.itemCount} item{p.itemCount === 1 ? "" : "s"}
                </span>
                <span className="tabular-nums">
                  {money(p, p.subtotalMinor)} + {money(p, p.shippingMinor)} shipping
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Shipping</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.purchaseId}>
                <TableCell>{p.date}</TableCell>
                <TableCell>
                  <Link href={`/purchases/${p.purchaseId}`} className="underline underline-offset-4">
                    {p.seller}
                  </Link>
                </TableCell>
                <TableCell>{p.currency}</TableCell>
                <TableCell className="text-right tabular-nums">{p.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{money(p, p.subtotalMinor)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(p, p.shippingMinor)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatMoney(purchaseTotal(p))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
