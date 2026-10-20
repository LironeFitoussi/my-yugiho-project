import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function ProductsPage() {
  await requireOwner();
  return <PageHeader title="Products" description="Decks, packs, boxes and collections you have purchased." />;
}
