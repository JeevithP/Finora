import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/80 bg-card shadow-2xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-32 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardHeader className="pb-2 space-y-1.5">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-3 w-60 rounded" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardHeader className="pb-2 space-y-1.5">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-3 w-60 rounded" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-[280px] w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual Skeleton */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardHeader className="pb-3 space-y-1.5">
          <Skeleton className="h-5 w-52 rounded" />
          <Skeleton className="h-3 w-72 rounded" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
