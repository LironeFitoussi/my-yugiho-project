import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function SettingsPage() {
  await requireOwner();
  return <PageHeader title="Settings" description="Account and app settings." />;
}
