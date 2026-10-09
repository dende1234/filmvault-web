import { HeroSkeleton, RailSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilmLoading() {
  return (
    <div className="flex flex-col gap-10">
      <HeroSkeleton />
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-8">
            <RailSkeleton />
          </div>
        </div>
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  );
}
