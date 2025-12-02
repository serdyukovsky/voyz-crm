"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-sm" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("border shadow-sm animate-in fade-in-50 duration-300", className)}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-3 w-56 rounded-sm" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-5/6 rounded-sm" />
          <Skeleton className="h-4 w-4/6 rounded-sm" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in-50 duration-300">
      <div className="flex gap-4 p-4 bg-card rounded-lg border">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1 rounded-md" />
              <Skeleton className="h-16 flex-1 rounded-md" />
              <Skeleton className="h-16 flex-1 rounded-md" />
              <Skeleton className="h-16 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in-50 duration-300">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-56 rounded-md" />
                <Skeleton className="h-3.5 w-40 rounded-sm" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in-50 duration-300">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-5 w-5 rounded-sm" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-36 mb-2 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-sm" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-24 rounded-sm" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-24 rounded-sm" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-24 rounded-sm" />
              <Skeleton className="h-7 w-3/4 rounded-md" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}






