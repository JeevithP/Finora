"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { BudgetVsActualItem, CategoryExpenseItem } from "@/lib/analytics/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface BudgetVsActualCardProps {
  budgets: BudgetVsActualItem[];
  unbudgeted: CategoryExpenseItem[];
  defaultCurrency: string;
  isMultiMonth: boolean;
}

function DynamicCategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = ((Icons as unknown as Record<string, LucideIcon>)[
    name
  ] || Icons.Tag) as LucideIcon;
  return <IconComponent className={className} />;
}

export function BudgetVsActualCard({
  budgets,
  unbudgeted,
  defaultCurrency,
  isMultiMonth,
}: BudgetVsActualCardProps) {
  const totalBudgeted = budgets.reduce((acc, curr) => acc + curr.budgetedAmount, 0);
  const totalBudgetedSpent = budgets.reduce((acc, curr) => acc + curr.actualSpent, 0);
  const totalUnbudgetedSpent = unbudgeted.reduce(
    (acc, curr) => acc + curr.effectiveExpense,
    0
  );

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Budget vs. Actual Spending
              </CardTitle>
              {isMultiMonth && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  Summed Period Total
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Reconciliation of planned monthly allowances against actual net outflows
            </CardDescription>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-muted-foreground block">
                Total Budgeted: {formatCurrency(totalBudgeted, defaultCurrency)}
              </span>
              <span className="text-xs font-bold text-foreground">
                Spent: {formatCurrency(totalBudgetedSpent, defaultCurrency)}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Link href="/budgets">
                Manage Budgets
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {budgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">
              No budgets configured for this timeframe.
            </p>
            <p>
              Set category spending limits in the Budgets section to track your planned vs actual spending variance.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-2">
              <Link href="/budgets">Create a Monthly Budget</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map((item) => {
              const isOver = item.isOverBudget;
              const isNear = item.percentageSpent >= 80 && !isOver;

              let statusColor = "bg-emerald-500";
              let badgeVariant = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
              let StatusIcon = CheckCircle2;
              let statusLabel = "On Track";

              if (isOver) {
                statusColor = "bg-rose-500";
                badgeVariant = "bg-rose-500/10 text-rose-600 border-rose-500/20";
                StatusIcon = AlertCircle;
                statusLabel = "Over Budget";
              } else if (isNear) {
                statusColor = "bg-amber-500";
                badgeVariant = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                StatusIcon = AlertTriangle;
                statusLabel = "Near Limit";
              }

              return (
                <div
                  key={item.categoryId}
                  className="rounded-xl border border-border/70 p-3.5 bg-card/60 hover:bg-accent/20 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${item.categoryColor}20`,
                          color: item.categoryColor,
                        }}
                      >
                        <DynamicCategoryIcon
                          name={item.categoryIcon}
                          className="h-4 w-4"
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground text-sm">
                          {item.categoryName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <span>
                            Budget: {formatCurrency(item.budgetedAmount, defaultCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="font-bold font-mono text-foreground block">
                          {formatCurrency(item.actualSpent, defaultCurrency)}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            isOver ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {isOver
                            ? `+${formatCurrency(Math.abs(item.variance), defaultCurrency)} over`
                            : `${formatCurrency(item.variance, defaultCurrency)} left`}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 gap-1 font-medium ${badgeVariant}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusLabel} ({formatPercentage(item.percentageSpent)})
                      </Badge>
                    </div>
                  </div>

                  <Progress
                    value={Math.min(100, item.percentageSpent)}
                    className="h-2 bg-muted"
                    style={
                      {
                        "--progress-background": statusColor,
                      } as React.CSSProperties
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Unbudgeted Spending Section */}
        {unbudgeted.length > 0 && (
          <div className="pt-3 border-t border-border/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Unbudgeted Category Spending</span>
              </div>
              <span className="font-semibold text-muted-foreground font-mono">
                {formatCurrency(totalUnbudgetedSpent, defaultCurrency)} Total
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unbudgeted.map((item) => (
                <div
                  key={item.categoryId || "uncat"}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{
                        backgroundColor: `${item.categoryColor}20`,
                        color: item.categoryColor,
                      }}
                    >
                      <DynamicCategoryIcon
                        name={item.categoryIcon}
                        className="h-3 w-3"
                      />
                    </div>
                    <span className="font-medium truncate">
                      {item.categoryName}
                    </span>
                  </div>
                  <span className="font-semibold font-mono text-foreground shrink-0">
                    {formatCurrency(item.effectiveExpense, defaultCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
