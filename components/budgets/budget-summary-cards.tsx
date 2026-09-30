"use client";

import React from "react";
import { PiggyBank, Flame, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

interface BudgetSummaryCardsProps {
  totalBudgeted: number;
  totalSpent: number;
  defaultCurrency: string;
  foreignCurrencyCount?: number;
}

export function BudgetSummaryCards({
  totalBudgeted,
  totalSpent,
  defaultCurrency,
  foreignCurrencyCount = 0,
}: BudgetSummaryCardsProps) {
  const remaining = totalBudgeted - totalSpent;
  const isOverBudget = totalSpent > totalBudgeted && totalBudgeted > 0;
  const percentageSpent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Budgeted */}
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Budgeted
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalBudgeted, defaultCurrency)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Across all budgeted categories
            </p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Spent
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isOverBudget
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalSpent, defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {totalBudgeted > 0
                  ? `${formatPercentage(percentageSpent)} of monthly budget`
                  : "No budget allocated"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Allowance */}
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isOverBudget ? "Over Budget" : "Remaining Allowance"}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isOverBudget
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {isOverBudget ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
              </div>
            </div>
            <div
              className={`mt-2 text-2xl font-bold tracking-tight ${
                isOverBudget
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(Math.abs(remaining), defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  isOverBudget
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    : percentageSpent >= 80
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}
              >
                {isOverBudget
                  ? "Exceeded Limit"
                  : percentageSpent >= 80
                  ? "Near Limit"
                  : "On Track"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {isOverBudget ? "Requires adjustment" : "Within allowance"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {foreignCurrencyCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>
            {foreignCurrencyCount} transaction(s) in non-{defaultCurrency} accounts are excluded from standard totals to preserve financial currency integrity.
          </span>
        </div>
      )}
    </div>
  );
}
