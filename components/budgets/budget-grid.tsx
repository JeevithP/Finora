"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PiggyBank } from "lucide-react";

import { BudgetWithCategory } from "@/actions/budgets";
import { Category } from "@/types/database.types";
import { BudgetPeriodSelector } from "./budget-period-selector";
import { BudgetSummaryCards } from "./budget-summary-cards";
import { BudgetCard } from "./budget-card";
import { BudgetEmptyState } from "./budget-empty-state";
import { CreateBudgetDialog } from "./create-budget-dialog";

export interface CategorySpendData {
  baseSpent: number; // Net spend in defaultCurrency: sum(expense) - sum(refund)
  rawNetSpent: number; // Unclamped net spend
  foreignCount: number;
}

interface BudgetGridProps {
  budgets: BudgetWithCategory[];
  categories: Category[];
  spendMap: Record<string, CategorySpendData>;
  month: number;
  year: number;
  defaultCurrency: string;
}

export function BudgetGrid({
  budgets,
  categories,
  spendMap,
  month,
  year,
  defaultCurrency,
}: BudgetGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePeriodChange = (newMonth: number, newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(newMonth));
    params.set("year", String(newYear));
    router.push(`/budgets?${params.toString()}`);
  };

  // Find categories that don't have a budget in this month yet
  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = categories.filter(
    (c) => !budgetedCategoryIds.has(c.id)
  );

  // Calculate totals
  const totalBudgeted = budgets.reduce(
    (acc, b) => acc + Number(b.amount || 0),
    0
  );

  const totalSpent = budgets.reduce((acc, b) => {
    const data = spendMap[b.category_id];
    return acc + (data?.baseSpent || 0);
  }, 0);

  const totalForeignCount = Object.values(spendMap).reduce(
    (acc, s) => acc + s.foreignCount,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Budgets
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor monthly category spending limits, refunds, and financial targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <BudgetPeriodSelector
            month={month}
            year={year}
            onPeriodChange={handlePeriodChange}
          />
          {budgets.length > 0 && (
            <CreateBudgetDialog
              categories={categories}
              availableCategories={availableCategories}
              month={month}
              year={year}
              defaultCurrency={defaultCurrency}
            />
          )}
        </div>
      </div>

      {/* Aggregate Financial Metrics */}
      <BudgetSummaryCards
        totalBudgeted={totalBudgeted}
        totalSpent={totalSpent}
        defaultCurrency={defaultCurrency}
        foreignCurrencyCount={totalForeignCount}
      />

      {/* Budget Grid / Empty State */}
      {budgets.length === 0 ? (
        <BudgetEmptyState
          categories={categories}
          availableCategories={availableCategories}
          month={month}
          year={year}
          defaultCurrency={defaultCurrency}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Allocated Categories ({budgets.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              {availableCategories.length} unbudgeted expense categories
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const data = spendMap[budget.category_id] || {
                baseSpent: 0,
                rawNetSpent: 0,
                foreignCount: 0,
              };

              return (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  netSpent={data.baseSpent}
                  rawNetSpent={data.rawNetSpent}
                  defaultCurrency={defaultCurrency}
                  foreignCount={data.foreignCount}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
