import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function SetDetailPage({ params }: PageProps<"/sets/[id]">) {
  await requireOwner();
  const { id } = await params;
  return <PageHeader title={`Set ${id}`} />;
}
