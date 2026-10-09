import { PageHeaderSkeleton, PosterGridSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <PosterGridSkeleton count={18} />
    </div>
  );
}
