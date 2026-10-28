import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
          <Skeleton className="h-4 w-72 sm:w-96 mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Skeleton className="h-9 w-32 flex-1 sm:flex-initial" />
          <Skeleton className="h-9 w-36 flex-1 sm:flex-initial" />
        </div>
      </div>

      {/* 2. Overview KPI Cards Skeleton (4 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Top Insights Card Skeleton */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-7 w-28 shrink-0" />
        </CardContent>
      </Card>

      {/* 4. Two-Column Overview Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Budget Summary & Accounts Snapshot */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Budgets Skeleton */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-3 pt-1">
                {[1, 2, 3].map((b) => (
                  <div key={b} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accounts Snapshot Skeleton */}
          <Card className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="divide-y divide-border/60">
                {[1, 2, 3].map((a) => (
                  <div key={a} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Transactions Skeleton */}
        <div className="lg:col-span-6 h-full">
          <Card className="border-border/80 bg-card shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="divide-y divide-border/60">
                {[1, 2, 3, 4, 5].map((t) => (
                  <div key={t} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
