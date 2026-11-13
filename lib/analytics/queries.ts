import { createClient } from "@/lib/supabase/server";
import {
  getPeriodInterval,
  getPreviousPeriodInterval,
  getMonthProrationDetails,
} from "./periods";
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
  periodKey: AnalyticsPeriodKey = "this_month",
  includeTrend: boolean = true,
  customFrom?: string,
  customTo?: string
): Promise<AnalyticsData> {
  const period = getPeriodInterval(periodKey, new Date(), customFrom, customTo);
  const previousPeriod = getPreviousPeriodInterval(
    periodKey,
    new Date(),
    customFrom,
    customTo
  );
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("fn_get_analytics_data", {
    p_start_date: period.startDate,
    p_end_date_exclusive: period.endDateExclusive,
    p_prev_start_date: previousPeriod.startDate,
    p_prev_end_date_exclusive: previousPeriod.endDateExclusive,
    p_default_currency: defaultCurrency,
    p_months: period.months as unknown as Json,
    p_include_trend: includeTrend,
  });

  if (error) {
    console.error("Failed to load analytics data from database:", error);
    throw new Error("Failed to load analytics data. Please try again.");
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

  // For custom date ranges that touch partial months, calculate exact calendar-day proration
  // so spending from a partial period is not compared against full-month budget allowances.
  if (period.isCustom && period.customStartDate && period.customEndDate) {
    const prorationInfo = getMonthProrationDetails(
      period.customStartDate,
      period.customEndDate
    );

    if (prorationInfo.isPartial) {
      period.isPartialBudget = true;

      const rawBudgets: {
        category_id: string;
        amount: number;
        month: number;
        year: number;
      }[] = [];
      const BUDGET_BATCH_SIZE = 1000;
      let budgetOffset = 0;
      let hasMoreBudgets = true;

      while (hasMoreBudgets) {
        const { data: pageBudgets, error: rawBudgetsError } = await supabase
          .from("budgets")
          .select("category_id, amount, month, year")
          .eq("user_id", userId)
          .order("id", { ascending: true })
          .range(budgetOffset, budgetOffset + BUDGET_BATCH_SIZE - 1);

        if (rawBudgetsError) {
          console.error(
            "Failed to load budget data for proration:",
            rawBudgetsError
          );
          throw new Error("Failed to load budget data for proration.");
        }

        if (pageBudgets && pageBudgets.length > 0) {
          rawBudgets.push(...pageBudgets);
        }

        if (!pageBudgets || pageBudgets.length < BUDGET_BATCH_SIZE) {
          hasMoreBudgets = false;
        } else {
          budgetOffset += BUDGET_BATCH_SIZE;
        }
      }

      const proratedMap = new Map<string, number>();
      for (const b of rawBudgets || []) {
        const proration = prorationInfo.prorations.find(
          (p) => p.year === b.year && p.month === b.month
        );
        if (proration && b.category_id) {
          const current = proratedMap.get(b.category_id) || 0;
          proratedMap.set(
            b.category_id,
            current + Number(b.amount || 0) * proration.ratio
          );
        }
      }

      for (const item of budgetVsActual) {
        const proratedAmount = proratedMap.has(item.categoryId)
          ? Math.round((proratedMap.get(item.categoryId) || 0) * 100) / 100
          : 0;

        item.budgetedAmount = proratedAmount;
        item.variance =
          Math.round((proratedAmount - item.actualSpent) * 100) / 100;
        item.percentageSpent =
          proratedAmount > 0
            ? Number(((item.actualSpent / proratedAmount) * 100).toFixed(4))
            : 0;
        item.isOverBudget =
          proratedAmount > 0 && item.actualSpent > proratedAmount;
        item.hasBudget = proratedAmount > 0;
      }
    }
  }

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
