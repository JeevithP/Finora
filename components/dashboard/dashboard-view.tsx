"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Account, Category } from "@/types/database.types";
import { AnalyticsSummary, BudgetVsActualItem } from "@/lib/analytics/types";
import { FinancialInsight } from "@/lib/insights/types";
import { TransactionWithRelations } from "@/actions/transactions";

import { DashboardHeader } from "./dashboard-header";
import { DashboardOverviewCards } from "./dashboard-overview-cards";
import { DashboardInsights } from "./dashboard-insights";
import { DashboardBudgetSummary } from "./dashboard-budget-summary";
import { DashboardAccountsSnapshot } from "./dashboard-accounts-snapshot";
import { DashboardRecentTransactions } from "./dashboard-recent-transactions";

const CreateTransactionDialog = dynamic(
  () =>
    import("@/components/transactions/create-transaction-dialog").then(
      (mod) => mod.CreateTransactionDialog
    ),
  { ssr: false }
);

interface DashboardViewProps {
  displayName: string;
  netWorth: number;
  activeAccountsCount: number;
  summary: AnalyticsSummary;
  budgetVsActual: BudgetVsActualItem[];
  recentTransactions: TransactionWithRelations[];
  accounts: Account[];
  categories: Category[];
  insights: FinancialInsight[];
  defaultCurrency: string;
}

export function DashboardView({
  displayName,
  netWorth,
  activeAccountsCount,
  summary,
  budgetVsActual,
  recentTransactions,
  accounts,
  categories,
  insights,
  defaultCurrency,
}: DashboardViewProps) {
  const [createTxOpen, setCreateTxOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with Greeting and Action Buttons */}
      <DashboardHeader
        displayName={displayName}
        onAddTransaction={() => setCreateTxOpen(true)}
      />

      {/* 4 Core Financial KPI Overview Cards */}
      <DashboardOverviewCards
        netWorth={netWorth}
        activeAccountsCount={activeAccountsCount}
        totalIncome={summary.totalIncome}
        effectiveExpense={summary.effectiveExpense}
        rawNetExpense={summary.rawNetExpense}
        totalRefunds={summary.totalRefunds}
        netCashFlow={summary.netCashFlow}
        savingsRate={summary.savingsRate}
        defaultCurrency={defaultCurrency}
      />

      {/* Financial Insights (Top 2-3 Deterministic Insights for Current Month) */}
      {insights && insights.length > 0 && (
        <DashboardInsights insights={insights} />
      )}

      {/* Two-Column Financial Overview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Budgets + Accounts Snapshot */}
        <div className="lg:col-span-6 space-y-6">
          <DashboardBudgetSummary
            budgetVsActual={budgetVsActual}
            defaultCurrency={defaultCurrency}
          />
          <DashboardAccountsSnapshot
            accounts={accounts}
            defaultCurrency={defaultCurrency}
          />
        </div>

        {/* Right Column: Recent 5 Transactions */}
        <div className="lg:col-span-6 h-full">
          <DashboardRecentTransactions
            transactions={recentTransactions}
            defaultCurrency={defaultCurrency}
            onAddTransaction={() => setCreateTxOpen(true)}
          />
        </div>
      </div>

      {/* Quick Add Transaction Dialog */}
      <CreateTransactionDialog
        accounts={accounts}
        categories={categories}
        defaultCurrency={defaultCurrency}
        open={createTxOpen}
        onOpenChange={setCreateTxOpen}
      />
    </div>
  );
}
