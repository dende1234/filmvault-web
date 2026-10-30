import { PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-card" />
      ))}
    </div>
  );
}
