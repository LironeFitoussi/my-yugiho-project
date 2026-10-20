import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth";

export default async function WishlistPage() {
  await requireOwner();
  return <PageHeader title="Wishlist" description="Cards and products you want." />;
}
