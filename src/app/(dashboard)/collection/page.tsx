import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function CollectionPage() {
  await requireOwner();
  return <PageHeader title="Collection" description="Every physical copy you own." />;
}
