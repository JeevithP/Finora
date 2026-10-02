import React from "react";
import { redirect } from "next/navigation";
import { LineChart } from "lucide-react";

import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { parsePeriodKey } from "@/lib/analytics/periods";
import { getAnalyticsData } from "@/lib/analytics/queries";
import { AnalyticsPeriodSelector } from "@/components/analytics/analytics-period-selector";
import { AnalyticsSummaryCards } from "@/components/analytics/analytics-summary-cards";
import { FinancialInsightsCard } from "@/components/insights/financial-insights-card";
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart";
import { CategoryExpenseChart } from "@/components/analytics/category-expense-chart";
import { BudgetVsActualCard } from "@/components/analytics/budget-vs-actual-card";
import { CurrencyExclusionBanner } from "@/components/analytics/currency-exclusion-banner";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams?: Promise<{
    period?: string;
  }>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const periodKey = parsePeriodKey(resolvedParams.period);

  const profile = await getUserProfile(user.id);
  const defaultCurrency = profile?.default_currency || "INR";

  const data = await getAnalyticsData(user.id, defaultCurrency, periodKey);

  const isMultiMonth = data.period.months.length > 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LineChart className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Analytics &amp; Insights
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Financial performance, monthly cash flow trends, and category spending analytics.
          </p>
        </div>

        {/* Period Selector Controls */}
        <AnalyticsPeriodSelector currentPeriod={periodKey} />
      </div>

      {/* Multi-Currency Notice Banner */}
      <CurrencyExclusionBanner
        foreignTxCount={data.summary.foreignTxCount}
        foreignCurrencies={data.summary.foreignCurrencies}
        defaultCurrency={defaultCurrency}
      />

      {/* Main Analytics Content */}
      {!data.hasTransactions ? (
        <AnalyticsEmptyState periodLabel={data.period.label} />
      ) : (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <AnalyticsSummaryCards
            summary={data.summary}
            defaultCurrency={defaultCurrency}
          />

          {/* Financial Insights Card */}
          <FinancialInsightsCard insights={data.insights} />

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            {/* Monthly Cash Flow Trend */}
            <MonthlyTrendChart
              data={data.monthlyTrend}
              defaultCurrency={defaultCurrency}
            />

            {/* Category Spending Breakdown */}
            <CategoryExpenseChart
              categories={data.categoryBreakdown}
              defaultCurrency={defaultCurrency}
            />
          </div>

          {/* Budget vs. Actual Spending Reconciliation */}
          <BudgetVsActualCard
            budgets={data.budgetVsActual}
            unbudgeted={data.unbudgetedSpending}
            defaultCurrency={defaultCurrency}
            isMultiMonth={isMultiMonth}
          />
        </div>
      )}
    </div>
  );
}
