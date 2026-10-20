import { PageSkeleton } from "@/components/shared/page-skeleton";

// Segment-level Suspense boundary: every dashboard page reads the session (requireOwner) at
// request time, so navigations show this loader instantly while the page streams in.
export default function DashboardLoading() {
  return <PageSkeleton />;
}
