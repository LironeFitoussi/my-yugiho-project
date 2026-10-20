import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function CardsPage() {
  await requireOwner();
  return <PageHeader title="Card Catalog" description="Search the Yu-Gi-Oh! TCG catalog by name, card ID, passcode or set code." />;
}
