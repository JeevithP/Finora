import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="mt-3">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs & Grid Skeleton */}
      <div className="space-y-4 pt-2">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border/80 bg-card shadow-xs p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-baseline">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-10 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
