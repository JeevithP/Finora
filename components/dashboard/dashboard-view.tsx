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
import { DashboardGettingStarted } from "./dashboard-getting-started";
import { DashboardNextSteps } from "./dashboard-next-steps";

const CreateTransactionDialog = dynamic(
  () =>
    import("@/components/transactions/create-transaction-dialog").then(
      (mod) => mod.CreateTransactionDialog
    ),
  { ssr: false }
);

const CreateAccountDialog = dynamic(
  () =>
    import("@/components/accounts/create-account-dialog").then(
      (mod) => mod.CreateAccountDialog
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
  hasTransactions?: boolean;
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
  hasTransactions: explicitHasTransactions,
}: DashboardViewProps) {
  const [createTxOpen, setCreateTxOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  // Authoritative onboarding state derivation
  const hasAccounts = accounts.length > 0;
  const hasTransactions =
    explicitHasTransactions !== undefined
      ? explicitHasTransactions
      : recentTransactions.length > 0;

  const onboardingState: "NO_ACCOUNTS" | "ACCOUNTS_NO_TRANSACTIONS" | "ACTIVE_USER" =
    !hasAccounts
      ? "NO_ACCOUNTS"
      : !hasTransactions
      ? "ACCOUNTS_NO_TRANSACTIONS"
      : "ACTIVE_USER";

  return (
    <div className="space-y-6">
      {/* 1. Brand New User with 0 Accounts: Dedicated Getting Started Experience */}
      {onboardingState === "NO_ACCOUNTS" && (
        <>
          <DashboardHeader
            displayName={displayName}
            onboardingState="NO_ACCOUNTS"
            onAddTransaction={() => setCreateTxOpen(true)}
            onAddAccount={() => setCreateAccountOpen(true)}
          />
          <DashboardGettingStarted
            displayName={displayName}
            onAddAccount={() => setCreateAccountOpen(true)}
          />
        </>
      )}

      {/* 2. User with Accounts but 0 Transactions: Next-Step Setup Guide */}
      {onboardingState === "ACCOUNTS_NO_TRANSACTIONS" && (
        <>
          <DashboardHeader
            displayName={displayName}
            onboardingState="ACCOUNTS_NO_TRANSACTIONS"
            onAddTransaction={() => setCreateTxOpen(true)}
            onAddAccount={() => setCreateAccountOpen(true)}
          />

          <DashboardNextSteps
            accountsCount={accounts.length}
            netWorth={netWorth}
            defaultCurrency={defaultCurrency}
            onAddTransaction={() => setCreateTxOpen(true)}
          />

          {/* 4 Core Financial KPI Overview Cards displaying initial tracked Net Worth */}
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

          {/* Two-Column Financial Overview Layout with actionable empty states */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 space-y-6">
              <DashboardAccountsSnapshot
                accounts={accounts}
                defaultCurrency={defaultCurrency}
                onAddAccount={() => setCreateAccountOpen(true)}
              />
              <DashboardBudgetSummary
                budgetVsActual={budgetVsActual}
                defaultCurrency={defaultCurrency}
              />
            </div>

            <div className="lg:col-span-6 h-full">
              <DashboardRecentTransactions
                transactions={recentTransactions}
                defaultCurrency={defaultCurrency}
                onAddTransaction={() => setCreateTxOpen(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* 3. Active User with Accounts & Transactions: Full M9 Dashboard */}
      {onboardingState === "ACTIVE_USER" && (
        <>
          <DashboardHeader
            displayName={displayName}
            onboardingState="ACTIVE_USER"
            onAddTransaction={() => setCreateTxOpen(true)}
            onAddAccount={() => setCreateAccountOpen(true)}
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
                onAddAccount={() => setCreateAccountOpen(true)}
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
        </>
      )}

      {/* Quick Add Transaction Dialog */}
      <CreateTransactionDialog
        accounts={accounts}
        categories={categories}
        defaultCurrency={defaultCurrency}
        open={createTxOpen}
        onOpenChange={setCreateTxOpen}
      />

      {/* Quick Add Account Dialog */}
      <CreateAccountDialog
        defaultCurrency={defaultCurrency}
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
      />
    </div>
  );
}
