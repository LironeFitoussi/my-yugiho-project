import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function PortfolioPage() {
  await requireOwner();
  return <PageHeader title="Portfolio" description="Total invested versus estimated market value." />;
}
