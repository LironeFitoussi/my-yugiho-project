import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function PurchasesPage() {
  await requireOwner();
  return <PageHeader title="Purchases" description="Purchase history, sellers and shipping." />;
}
