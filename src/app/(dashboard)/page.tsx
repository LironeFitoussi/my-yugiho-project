import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function DashboardPage() {
  await requireOwner();
  return <PageHeader title="Dashboard" description="Your collection at a glance." />;
}
