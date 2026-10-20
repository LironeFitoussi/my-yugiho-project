import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { CollectionTiles } from "@/features/dashboard/components/collection-tiles";
import { MarketTiles } from "@/features/dashboard/components/market-tiles";
import { RecentAcquisitions } from "@/features/dashboard/components/recent-acquisitions";
import { RecentPurchases } from "@/features/dashboard/components/recent-purchases";
import { SetProgressSection } from "@/features/dashboard/components/set-progress-section";
import { SectionSkeleton, TilesSkeleton } from "@/features/dashboard/components/stat-tile";
import { WishlistSummary } from "@/features/dashboard/components/wishlist-summary";
import { requireOwner } from "@/lib/auth";

// Each section suspends on its own so a slow catalog or FX provider never blocks the DB tiles.
export default async function DashboardPage() {
  await requireOwner();
  return (
    <div className="grid gap-6">
      <PageHeader title="Dashboard" description="Your collection at a glance." />

      <section aria-label="Collection totals" className="grid gap-3">
        <Suspense fallback={<TilesSkeleton count={4} />}>
          <CollectionTiles />
        </Suspense>
        <Suspense fallback={<TilesSkeleton count={3} />}>
          <MarketTiles />
        </Suspense>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton rows={6} />}>
          <RecentAcquisitions />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={5} />}>
          <RecentPurchases />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={6} />}>
          <SetProgressSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={2} />}>
          <WishlistSummary />
        </Suspense>
      </div>
    </div>
  );
}
