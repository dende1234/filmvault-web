import { Skeleton } from "@/components/ui/skeleton";

/** Loading shapes that mirror the real layouts, so pages don't jump. */
export function HeroSkeleton() {
  return (
    <div className="-mx-4 -mt-4 bg-cinema md:-mx-8 md:-mt-8">
      <div className="mx-auto flex min-h-[22rem] max-w-6xl items-end gap-6 px-4 pb-8 pt-24 md:min-h-[30rem] md:px-8 md:pb-10">
        <Skeleton className="aspect-[2/3] w-32 shrink-0 rounded-lg sm:w-44" />
        <div className="flex w-full max-w-xl flex-col gap-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function RailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-32 shrink-0 rounded-lg sm:w-36" />
        ))}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}
