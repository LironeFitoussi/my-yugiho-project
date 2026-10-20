// Pure purchase math (PRD §11, §12). Integer minor units only; currencies are never mixed.
import { type Currency, type Money, sumByCurrency } from "@/lib/money";
import type { CardCopy, Product, Purchase } from "@/types";

/** Purchase total = subtotal (from items) + shipping (separate). Computed on read, never stored. */
export function purchaseTotal(p: Pick<Purchase, "currency" | "subtotalMinor" | "shippingMinor">): Money {
  return { amountMinor: p.subtotalMinor + p.shippingMinor, currency: p.currency };
}

/** Sum of purchase totals per currency. */
export function purchasesTotalByCurrency(
  purchases: Pick<Purchase, "currency" | "subtotalMinor" | "shippingMinor">[],
): Record<Currency, number> {
  return sumByCurrency(purchases.map(purchaseTotal));
}

/**
 * Total invested per currency, without double counting:
 * - every purchase contributes subtotal + shipping;
 * - copies/products NOT linked to a purchase contribute their own price (+ product shipping);
 * - linked copies/products contribute nothing — their cost is already inside their purchase.
 * Linked entries are skipped defensively even if a caller passes them in.
 */
export function totalInvested({
  purchases,
  unlinkedCopies = [],
  unlinkedProducts = [],
}: {
  purchases: Pick<Purchase, "currency" | "subtotalMinor" | "shippingMinor">[];
  unlinkedCopies?: Pick<CardCopy, "purchasePrice" | "purchaseId">[];
  unlinkedProducts?: Pick<Product, "price" | "shipping" | "purchaseId">[];
}): Record<Currency, number> {
  const amounts: Money[] = purchases.map(purchaseTotal);
  for (const copy of unlinkedCopies) {
    if (copy.purchaseId) continue;
    if (copy.purchasePrice) amounts.push(copy.purchasePrice);
  }
  for (const product of unlinkedProducts) {
    if (product.purchaseId) continue;
    if (product.price) amounts.push(product.price);
    if (product.shipping) amounts.push(product.shipping);
  }
  return sumByCurrency(amounts);
}
