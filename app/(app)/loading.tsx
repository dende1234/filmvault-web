import { PageHeaderSkeleton, PosterGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton />
      <PosterGridSkeleton />
    </div>
  );
}
