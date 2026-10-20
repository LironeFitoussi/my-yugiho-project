import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function CardDetailPage({ params }: PageProps<"/cards/[id]">) {
  await requireOwner();
  const { id } = await params;
  return <PageHeader title={`Card ${id}`} />;
}
