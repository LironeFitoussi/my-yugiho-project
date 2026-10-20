import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function SetsPage() {
  await requireOwner();
  return <PageHeader title="Official Sets" description="Browse official TCG sets and track completion." />;
}
