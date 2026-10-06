import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RotateCcw,
} from "lucide-react";
import { AnalyticsSummary } from "@/lib/analytics/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
  defaultCurrency: string;
}

export function AnalyticsSummaryCards({
  summary,
  defaultCurrency,
}: AnalyticsSummaryCardsProps) {
  const isPositiveCashFlow = summary.netCashFlow >= 0;
  const hasRefunds = summary.totalRefunds > 0;
  const isRefundOverExpense = summary.rawNetExpense < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Income */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Income
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(summary.totalIncome, defaultCurrency)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            From all recorded income sources
          </p>
        </CardContent>
      </Card>

      {/* 2. Effective Expense */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Effective Expense
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(summary.effectiveExpense, defaultCurrency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {hasRefunds ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RotateCcw className="h-3 w-3 text-amber-500" />
                Gross: {formatCurrency(summary.grossExpense, defaultCurrency)} (-
                {formatCurrency(summary.totalRefunds, defaultCurrency)})
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Gross outflows & card spend
              </span>
            )}
            {isRefundOverExpense && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20"
              >
                Refunds &gt; Spend
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Net Cash Flow */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Net Cash Flow
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isPositiveCashFlow
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600"
              }`}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight ${
              isPositiveCashFlow
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(summary.netCashFlow, defaultCurrency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                isPositiveCashFlow
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              }`}
            >
              {isPositiveCashFlow ? "Net Positive" : "Net Deficit"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              Income minus net expenses
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Savings Rate */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Savings Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {formatPercentage(summary.savingsRate)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.totalIncome > 0
              ? `${formatCurrency(Math.max(0, summary.netCashFlow), defaultCurrency)} retained of income`
              : "No income recorded in period"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
