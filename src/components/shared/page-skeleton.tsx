import { Skeleton } from "@/components/ui/skeleton";

import { CardLoader } from "./card-loader";

export function PageSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6">
      <CardLoader size="lg" caption="Drawing cards…" className="py-8" />
      <div className="grid gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
