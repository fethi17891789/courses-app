import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-[#ede9fe]", className)}
    />
  );
}

export function CardSkeleton({ accent = "#ddd6fe" }: { accent?: string }) {
  return (
    <div
      className="rounded-2xl bg-white p-4"
      style={{ boxShadow: `0 3px 0 ${accent}` }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 flex-shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-3/4 rounded-full" />
          <Skeleton className="h-2.5 w-1/2 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({
  count = 4,
  accent,
}: {
  count?: number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} accent={accent} />
      ))}
    </div>
  );
}
