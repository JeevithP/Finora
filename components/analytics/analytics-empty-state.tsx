"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  periodLabel: string;
}

export function AnalyticsEmptyState({ periodLabel }: AnalyticsEmptyStateProps) {
  return (
    <Card className="border-border/80 border-dashed bg-card/60 shadow-2xs">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          No Activity in {periodLabel}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
          There are no recorded transactions in this timeframe. Add income or expense transactions to populate your financial analytics, charts, and cash flow trends.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button asChild size="sm">
            <Link href="/transactions">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/accounts">View Accounts</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
