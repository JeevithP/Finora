"use client";

import React from "react";
import Link from "next/link";
import {
  Target,
  ArrowRight,
  Plus,
  AlertCircle,
  Tag,
  Utensils,
  Home,
  ShoppingCart,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
} from "lucide-react";
import { BudgetVsActualItem } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, React.ElementType> = {
  Tag,
  Utensils,
  Home,
  ShoppingCart,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
};

interface DashboardBudgetSummaryProps {
  budgetVsActual?: BudgetVsActualItem[];
  defaultCurrency?: string;
}

export function DashboardBudgetSummary({
  budgetVsActual = [],
  defaultCurrency = "INR",
}: DashboardBudgetSummaryProps) {
  const activeBudgets = budgetVsActual.filter((b) => b.hasBudget);

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Active Budgets
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly spending limits vs actual ledger expenses
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Link href="/budgets">
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        {activeBudgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                No active budgets for this month
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                Plan your category spending targets to stay on track and prevent overspending.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shadow-2xs">
              <Link href="/budgets">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Budget</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeBudgets.slice(0, 4).map((budget) => {
              const Icon = ICON_MAP[budget.categoryIcon] || Tag;
              const percentage = Math.min(budget.percentageSpent, 100);
              const isOver = budget.isOverBudget;

              let indicatorColor = "bg-emerald-500";
              if (isOver) {
                indicatorColor = "bg-rose-500";
              } else if (budget.percentageSpent >= 80) {
                indicatorColor = "bg-amber-500";
              }

              return (
                <div
                  key={budget.categoryId}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
                        style={{ backgroundColor: budget.categoryColor || "#3b82f6" }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {budget.categoryName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOver ? (
                        <Badge
                          variant="secondary"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] px-1.5 py-0 h-4 font-medium gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          <span>Exceeded</span>
                        </Badge>
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {Math.round(budget.percentageSpent)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-300 ${indicatorColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Spent vs Budget Amount */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-muted-foreground">
                      Spent:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(budget.actualSpent, defaultCurrency)}
                      </strong>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      Limit:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(budget.budgetedAmount, defaultCurrency)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
