"use client";

import React from "react";
import { PiggyBank } from "lucide-react";
import { Category } from "@/types/database.types";
import { CreateBudgetDialog } from "./create-budget-dialog";

interface BudgetEmptyStateProps {
  categories: Category[];
  availableCategories: Category[];
  month: number;
  year: number;
  defaultCurrency: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function BudgetEmptyState({
  categories,
  availableCategories,
  month,
  year,
  defaultCurrency,
}: BudgetEmptyStateProps) {
  const monthLabel = MONTH_NAMES[month - 1];

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-8 text-center shadow-2xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <PiggyBank className="h-7 w-7" />
      </div>

      <h3 className="text-lg font-semibold text-foreground">
        No Budgets for {monthLabel} {year}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
        Set monthly spending allowances for expense categories like Groceries, Dining, and Bills to monitor your cash flow.
      </p>

      <div className="mt-6">
        <CreateBudgetDialog
          categories={categories}
          availableCategories={availableCategories}
          month={month}
          year={year}
          defaultCurrency={defaultCurrency}
        />
      </div>
    </div>
  );
}
