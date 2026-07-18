import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export function ScreenSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f0ecff]">
      <div className="px-5 pb-1 pt-10">
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
      <div className="flex-1 px-5 pt-5 pb-28">
        <ListSkeleton count={count} />
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f0ecff]">
      <div className="px-5 pb-1 pt-10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-5 mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
      <div className="flex-1 px-5 pt-4 pb-28">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[76px] rounded-xl" />
          <Skeleton className="h-[76px] rounded-xl" />
        </div>
        <Skeleton className="mt-3 h-[76px] rounded-xl" />
        <Skeleton className="mt-3 h-[76px] rounded-xl" />
      </div>
    </main>
  );
}
