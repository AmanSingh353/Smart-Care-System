import { cn } from "@/lib/utils";

/** Calm skeleton placeholders for workspace / dashboard loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/70", className)} aria-hidden />;
}

export function WorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Loading patient workspace">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}
