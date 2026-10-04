import { createClient } from "@/lib/supabase/server";
import { getPeriodInterval, getPreviousPeriodInterval } from "./periods";
import {
  AnalyticsData,
  AnalyticsPeriodKey,
  AnalyticsSummary,
  BudgetVsActualItem,
  CategoryExpenseItem,
  MonthlyTrendPoint,
} from "./types";
import { Json } from "@/types/database.types";
import { generateFinancialInsights } from "@/lib/insights/engine";

interface RpcAnalyticsResponse {
  summary: {
    totalIncome: number;
    grossExpense: number;
    totalRefunds: number;
    rawNetExpense: number;
    effectiveExpense: number;
    netCashFlow: number;
    savingsRate: number;
    txCount: number;
    foreignTxCount: number;
    foreignCurrencies: Record<string, number>;
  };
  previousPeriodSummary: {
    totalIncome: number;
    grossExpense: number;
    totalRefunds: number;
    rawNetExpense: number;
    effectiveExpense: number;
    netCashFlow: number;
    savingsRate: number;
    txCount: number;
    foreignTxCount: number;
    foreignCurrencies: Record<string, number>;
  };
  monthlyTrend: {
    year: number;
    month: number;
    key: string;
    label: string;
    income: number;
    grossExpense: number;
    refunds: number;
    rawNetExpense: number;
    effectiveExpense: number;
    netCashFlow: number;
  }[];
  categoryBreakdown: {
    categoryId: string | null;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    isSystem: boolean;
    grossExpense: number;
    refunds: number;
    rawNetExpense: number;
    effectiveExpense: number;
    percentageOfTotal: number;
    txCount: number;
  }[];
  budgetVsActual: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    budgetedAmount: number;
    actualSpent: number;
    rawNetSpent: number;
    variance: number;
    percentageSpent: number;
    isOverBudget: boolean;
    hasBudget: boolean;
  }[];
  unbudgetedSpending: {
    categoryId: string | null;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    isSystem: boolean;
    grossExpense: number;
    refunds: number;
    rawNetExpense: number;
    effectiveExpense: number;
    percentageOfTotal: number;
    txCount: number;
  }[];
  hasTransactions: boolean;
}

/**
 * Executes high-performance database-side analytics aggregation via the
 * public.fn_get_analytics_data PostgreSQL RPC, preserving exact financial semantics
 * with strict fail-closed error handling.
 */
export async function getAnalyticsData(
  userId: string,
  defaultCurrency: string = "INR",
  periodKey: AnalyticsPeriodKey = "this_month"
): Promise<AnalyticsData> {
  const period = getPeriodInterval(periodKey);
  const previousPeriod = getPreviousPeriodInterval(periodKey);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("fn_get_analytics_data", {
    p_start_date: period.startDate,
    p_end_date_exclusive: period.endDateExclusive,
    p_prev_start_date: previousPeriod.startDate,
    p_prev_end_date_exclusive: previousPeriod.endDateExclusive,
    p_default_currency: defaultCurrency,
    p_months: period.months as unknown as Json,
  });

  if (error) {
    throw new Error(`Failed to load analytics data: ${error.message}`);
  }

  const rpcData = data as unknown as RpcAnalyticsResponse;
  if (!rpcData || !rpcData.summary) {
    throw new Error("Invalid analytics payload returned from database");
  }

  const summary: AnalyticsSummary = {
    totalIncome: Number(rpcData.summary.totalIncome) || 0,
    grossExpense: Number(rpcData.summary.grossExpense) || 0,
    totalRefunds: Number(rpcData.summary.totalRefunds) || 0,
    rawNetExpense: Number(rpcData.summary.rawNetExpense) || 0,
    effectiveExpense: Number(rpcData.summary.effectiveExpense) || 0,
    netCashFlow: Number(rpcData.summary.netCashFlow) || 0,
    savingsRate: Number(rpcData.summary.savingsRate) || 0,
    txCount: Number(rpcData.summary.txCount) || 0,
    foreignTxCount: Number(rpcData.summary.foreignTxCount) || 0,
    foreignCurrencies: (rpcData.summary.foreignCurrencies || {}) as Record<string, number>,
  };

  const previousPeriodSummary: AnalyticsSummary = {
    totalIncome: Number(rpcData.previousPeriodSummary.totalIncome) || 0,
    grossExpense: Number(rpcData.previousPeriodSummary.grossExpense) || 0,
    totalRefunds: Number(rpcData.previousPeriodSummary.totalRefunds) || 0,
    rawNetExpense: Number(rpcData.previousPeriodSummary.rawNetExpense) || 0,
    effectiveExpense: Number(rpcData.previousPeriodSummary.effectiveExpense) || 0,
    netCashFlow: Number(rpcData.previousPeriodSummary.netCashFlow) || 0,
    savingsRate: Number(rpcData.previousPeriodSummary.savingsRate) || 0,
    txCount: Number(rpcData.previousPeriodSummary.txCount) || 0,
    foreignTxCount: Number(rpcData.previousPeriodSummary.foreignTxCount) || 0,
    foreignCurrencies: (rpcData.previousPeriodSummary.foreignCurrencies || {}) as Record<string, number>,
  };

  const monthlyTrend: MonthlyTrendPoint[] = (rpcData.monthlyTrend || []).map((m) => ({
    year: Number(m.year),
    month: Number(m.month),
    key: String(m.key),
    label: String(m.label),
    income: Number(m.income) || 0,
    grossExpense: Number(m.grossExpense) || 0,
    refunds: Number(m.refunds) || 0,
    rawNetExpense: Number(m.rawNetExpense) || 0,
    effectiveExpense: Number(m.effectiveExpense) || 0,
    netCashFlow: Number(m.netCashFlow) || 0,
  }));

  const categoryBreakdown: CategoryExpenseItem[] = (rpcData.categoryBreakdown || []).map((c) => ({
    categoryId: c.categoryId || null,
    categoryName: String(c.categoryName || "Uncategorized"),
    categoryIcon: String(c.categoryIcon || "Tag"),
    categoryColor: String(c.categoryColor || "#64748b"),
    isSystem: Boolean(c.isSystem),
    grossExpense: Number(c.grossExpense) || 0,
    refunds: Number(c.refunds) || 0,
    rawNetExpense: Number(c.rawNetExpense) || 0,
    effectiveExpense: Number(c.effectiveExpense) || 0,
    percentageOfTotal: Number(c.percentageOfTotal) || 0,
    txCount: Number(c.txCount) || 0,
  }));

  const budgetVsActual: BudgetVsActualItem[] = (rpcData.budgetVsActual || []).map((b) => ({
    categoryId: String(b.categoryId),
    categoryName: String(b.categoryName || "Expense"),
    categoryIcon: String(b.categoryIcon || "Tag"),
    categoryColor: String(b.categoryColor || "#64748b"),
    budgetedAmount: Number(b.budgetedAmount) || 0,
    actualSpent: Number(b.actualSpent) || 0,
    rawNetSpent: Number(b.rawNetSpent) || 0,
    variance: Number(b.variance) || 0,
    percentageSpent: Number(b.percentageSpent) || 0,
    isOverBudget: Boolean(b.isOverBudget),
    hasBudget: Boolean(b.hasBudget),
  }));

  const unbudgetedSpending: CategoryExpenseItem[] = (rpcData.unbudgetedSpending || []).map((u) => ({
    categoryId: u.categoryId || null,
    categoryName: String(u.categoryName || "Uncategorized"),
    categoryIcon: String(u.categoryIcon || "Tag"),
    categoryColor: String(u.categoryColor || "#64748b"),
    isSystem: Boolean(u.isSystem),
    grossExpense: Number(u.grossExpense) || 0,
    refunds: Number(u.refunds) || 0,
    rawNetExpense: Number(u.rawNetExpense) || 0,
    effectiveExpense: Number(u.effectiveExpense) || 0,
    percentageOfTotal: Number(u.percentageOfTotal) || 0,
    txCount: Number(u.txCount) || 0,
  }));

  const hasTransactions = Boolean(rpcData.hasTransactions);

  const analyticsDataWithoutInsights: AnalyticsData = {
    period,
    defaultCurrency,
    summary,
    monthlyTrend,
    categoryBreakdown,
    budgetVsActual,
    unbudgetedSpending,
    hasTransactions,
    previousPeriodSummary,
    previousPeriodLabel: previousPeriod.label,
  };

  const insights = hasTransactions
    ? generateFinancialInsights(
        analyticsDataWithoutInsights,
        previousPeriodSummary,
        previousPeriod.label,
        defaultCurrency
      )
    : [];

  return {
    ...analyticsDataWithoutInsights,
    insights,
  };
}
