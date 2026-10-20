import { Suspense } from "react";

import { BottomNav, SidebarNav } from "@/components/layout/app-nav";
import { ArcaneBackdrop } from "@/components/layout/arcane-backdrop";
import { PageSkeleton } from "@/components/shared/page-skeleton";

// The shell is static; every page performs its own requireOwner() check inside
// this Suspense boundary (cacheComponents requires request-time reads to be suspended).
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <ArcaneBackdrop />
      <Suspense fallback={<div className="hidden md:block md:w-60 md:shrink-0 md:border-r md:bg-sidebar/70" />}>
        <SidebarNav />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5rem)] md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </div>
      </main>
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
