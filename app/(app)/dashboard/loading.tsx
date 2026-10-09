import { HeroSkeleton, RailSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-10">
      <HeroSkeleton />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <RailSkeleton />
        <RailSkeleton />
      </div>
    </div>
  );
}
