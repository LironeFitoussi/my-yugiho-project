import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayUtc } from "@/lib/aws/keys";
import { requireOwner } from "@/lib/auth";
import { ProductForm } from "@/features/products/components/product-form";
import { ProductList } from "@/features/products/components/product-list";
import { listProducts } from "@/features/products/queries";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  await requireOwner();
  const { cursor } = await searchParams;
  const page = await listProducts(typeof cursor === "string" ? cursor : null);

  return (
    <div className="grid gap-6">
      <PageHeader title="Products" description="Sealed and opened products you have bought." />
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Recording a product never adds its cards to your collection — add copies manually from the card page.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Add a product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm defaultDate={todayUtc()} />
        </CardContent>
      </Card>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Your products</h2>
        <ProductList products={page.items} />
        <div className="flex gap-3">
          {cursor ? (
            <Link href="/products" className="inline-flex min-h-11 items-center underline underline-offset-4">
              First page
            </Link>
          ) : null}
          {page.cursor ? (
            <Link
              href={`/products?cursor=${encodeURIComponent(page.cursor)}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Next page
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
