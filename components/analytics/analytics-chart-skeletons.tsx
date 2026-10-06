import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MonthlyTrendChartSkeleton() {
  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Income vs. Expense Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Monthly cash flow trajectory across the selected timeframe
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full min-w-0 flex flex-col justify-between p-2">
          {/* Legend placeholder */}
          <div className="flex justify-end gap-4 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted/60 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>

          {/* Bar Chart Skeletons */}
          <div className="flex-1 flex items-end justify-around gap-3 pt-6 pb-4 border-b border-border/40">
            {[45, 70, 55, 85, 60, 95].map((height, i) => (
              <div key={i} className="flex items-end gap-1 h-full w-full max-w-[48px]">
                <div
                  className="w-1/2 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-t-sm animate-pulse"
                  style={{ height: `${height}%` }}
                />
                <div
                  className="w-1/2 bg-rose-500/15 dark:bg-rose-500/20 rounded-t-sm animate-pulse"
                  style={{ height: `${Math.max(20, height - 15)}%` }}
                />
              </div>
            ))}
          </div>

          {/* XAxis labels placeholder */}
          <div className="flex justify-around pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-2.5 w-10 rounded bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryExpenseChartSkeleton() {
  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Expense by Category
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of spending across all expense categories
            </CardDescription>
          </div>
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-w-0">
          {/* Donut Chart Skeleton */}
          <div className="md:col-span-5 h-[220px] flex items-center justify-center relative min-w-0">
            <div className="h-40 w-40 rounded-full border-[18px] border-muted/50 border-t-primary/30 border-r-emerald-500/30 border-b-amber-500/30 animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-2.5 w-12 rounded bg-muted/70 mb-1 animate-pulse" />
                <div className="h-4 w-6 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>

          {/* Ranked Category List Skeleton */}
          <div className="md:col-span-7 space-y-3 max-h-[260px] pr-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-2 rounded-xl bg-card/40 border border-border/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-2.5 w-8 rounded bg-muted/60 animate-pulse" />
                  </div>
                </div>
                <div className="h-1.5 w-full rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
