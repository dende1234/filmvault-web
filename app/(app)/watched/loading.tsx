import { PageHeaderSkeleton, PosterGridSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchedLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-10 w-56 rounded-full" />
      <PosterGridSkeleton count={12} />
    </div>
  );
}
