'use client'

import { Skeleton } from "@/components/ui/skeleton"

export function DealCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 transition-all">
      {/* Drag Handle + Title */}
      <div className="flex items-start gap-2 mb-2">
        <div className="mt-0.5 text-muted-foreground/40">
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-full rounded animate-pulse-subtle" />
          <Skeleton className="h-4 w-2/3 rounded animate-pulse-subtle" style={{ animationDelay: '100ms' }} />
        </div>
      </div>

      {/* Client Name */}
      <div className="mb-3">
        <Skeleton className="h-3 w-1/2 rounded animate-pulse-subtle" style={{ animationDelay: '200ms' }} />
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5 mb-3">
        <Skeleton className="h-5 w-24 rounded animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Stage Pill */}
      <div className="mb-3">
        <Skeleton className="h-6 w-20 rounded-full animate-pulse-subtle" style={{ animationDelay: '400ms' }} />
      </div>

      {/* Footer: Avatar + Updated Time + Task Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-6 w-6 rounded-full animate-pulse-subtle" style={{ animationDelay: '500ms' }} />
          <Skeleton className="h-3 w-12 rounded animate-pulse-subtle" style={{ animationDelay: '600ms' }} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12 rounded animate-pulse-subtle" style={{ animationDelay: '700ms' }} />
          <Skeleton className="h-5 w-5 rounded animate-pulse-subtle" style={{ animationDelay: '800ms' }} />
        </div>
      </div>
    </div>
  )
}

export function DealColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72">
      <Skeleton className="h-7 w-40 mb-4 rounded-lg animate-pulse-subtle" />
      <div className="space-y-3 p-3 bg-card rounded-lg border shadow-sm min-h-[calc(100vh-300px)]">
        {[1, 2, 3].map((j) => (
          <DealCardSkeleton key={j} />
        ))}
      </div>
    </div>
  )
}
