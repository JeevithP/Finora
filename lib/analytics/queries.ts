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
import { Category } from "@/types/database.types";
import { generateFinancialInsights } from "@/lib/insights/engine";

interface RawAnalyticsTx {
  id: string;
  type: "income" | "expense" | "transfer" | "refund";
  amount: number;
  date: string;
  category_id: string | null;
  account?: {
    id: string;
    currency: string;
  } | null;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
    is_system: boolean;
  } | null;
}

interface RawBudgetRow {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
    is_system: boolean;
  } | null;
}

export async function getAnalyticsData(
  userId: string,
  defaultCurrency: string = "INR",
  periodKey: AnalyticsPeriodKey = "this_month"
): Promise<AnalyticsData> {
  const period = getPeriodInterval(periodKey);
  const previousPeriod = getPreviousPeriodInterval(periodKey);
  const supabase = await createClient();

  // Determine earliest start date across current and comparison periods
  const earliestStartDate =
    period.startDate < previousPeriod.startDate
      ? period.startDate
      : previousPeriod.startDate;

  // Extract unique years and months for budget lookup
  const years = Array.from(new Set(period.months.map((m) => m.year)));
  const months = Array.from(new Set(period.months.map((m) => m.month)));

  // Parallel server fetches in a single database roundtrip
  const [txResult, budgetsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, date, category_id, account:accounts!transactions_account_id_fkey(id, currency), category:categories(id, name, icon, color, type, is_system)"
      )
      .eq("user_id", userId)
      .gte("date", earliestStartDate)
      .lt("date", period.endDateExclusive),

    supabase
      .from("budgets")
      .select(
        "id, category_id, amount, month, year, category:categories(id, name, icon, color, type, is_system)"
      )
      .eq("user_id", userId)
      .in("year", years)
      .in("month", months),

    supabase
      .from("categories")
      .select("id, name, icon, color, type, is_system")
      .eq("type", "expense")
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .order("name", { ascending: true }),
  ]);

  const rawTransactions = (txResult.data || []) as unknown as RawAnalyticsTx[];
  const rawBudgets = (budgetsResult.data || []) as unknown as RawBudgetRow[];
  const allExpenseCategories = (categoriesResult.data || []) as Category[];

  // 1. Initialize monthly trend buckets
  const monthlyMap: Record<string, MonthlyTrendPoint> = {};
  period.months.forEach((m) => {
    monthlyMap[m.key] = {
      year: m.year,
      month: m.month,
      key: m.key,
      label: m.label,
      income: 0,
      grossExpense: 0,
      refunds: 0,
      rawNetExpense: 0,
      effectiveExpense: 0,
      netCashFlow: 0,
    };
  });

  // 2. Initialize category tracking map
  const catMap: Record<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      isSystem: boolean;
      grossExpense: number;
      refunds: number;
      txCount: number;
    }
  > = {};

  // Pre-seed known expense categories so they are readily available
  allExpenseCategories.forEach((cat) => {
    catMap[cat.id] = {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon || "Tag",
      categoryColor: cat.color || "#64748b",
      isSystem: cat.is_system,
      grossExpense: 0,
      refunds: 0,
      txCount: 0,
    };
  });

  // Track global summary aggregates for CURRENT period
  let totalIncome = 0;
  let grossExpense = 0;
  let totalRefunds = 0;
  let baseTxCount = 0;
  let foreignTxCount = 0;
  const foreignCurrencies: Record<string, number> = {};

  // Track summary aggregates for PREVIOUS period
  let prevTotalIncome = 0;
  let prevGrossExpense = 0;
  let prevTotalRefunds = 0;
  let prevBaseTxCount = 0;
  let prevForeignTxCount = 0;
  const prevForeignCurrencies: Record<string, number> = {};

  // 3. Process transactions across current and previous intervals
  rawTransactions.forEach((tx) => {
    const txCurrency = (tx.account?.currency || defaultCurrency).toUpperCase();
    const isBaseCurrency = txCurrency === defaultCurrency.toUpperCase();
    const amount = Number(tx.amount) || 0;
    const txDate = tx.date;

    const isCurrent =
      txDate >= period.startDate && txDate < period.endDateExclusive;
    const isPrevious =
      txDate >= previousPeriod.startDate &&
      txDate < previousPeriod.endDateExclusive;

    // Process Previous Period
    if (isPrevious) {
      if (!isBaseCurrency) {
        prevForeignTxCount += 1;
        prevForeignCurrencies[txCurrency] =
          (prevForeignCurrencies[txCurrency] || 0) + 1;
      } else {
        if (tx.type === "income") {
          prevBaseTxCount += 1;
          prevTotalIncome += amount;
        } else if (tx.type === "expense") {
          prevBaseTxCount += 1;
          prevGrossExpense += amount;
        } else if (tx.type === "refund") {
          prevBaseTxCount += 1;
          prevTotalRefunds += amount;
        }
      }
    }

    // Process Current Period
    if (isCurrent) {
      if (!isBaseCurrency) {
        foreignTxCount += 1;
        foreignCurrencies[txCurrency] =
          (foreignCurrencies[txCurrency] || 0) + 1;
        return; // Exclude foreign currency transactions from standard base totals
      }

      const monthKey = txDate.slice(0, 7); // "YYYY-MM"

      // Resolve category key and data
      let catKey = tx.category_id;
      if (!catKey) {
        catKey = "uncategorized";
        if (!catMap[catKey]) {
          catMap[catKey] = {
            categoryId: null,
            categoryName: "Uncategorized",
            categoryIcon: "Tag",
            categoryColor: "#64748b",
            isSystem: false,
            grossExpense: 0,
            refunds: 0,
            txCount: 0,
          };
        }
      } else if (!catMap[catKey]) {
        catMap[catKey] = {
          categoryId: tx.category_id,
          categoryName: tx.category?.name || "Other Expense",
          categoryIcon: tx.category?.icon || "Tag",
          categoryColor: tx.category?.color || "#64748b",
          isSystem: tx.category?.is_system || false,
          grossExpense: 0,
          refunds: 0,
          txCount: 0,
        };
      }

      if (tx.type === "income") {
        baseTxCount += 1;
        totalIncome += amount;
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].income += amount;
        }
      } else if (tx.type === "expense") {
        baseTxCount += 1;
        grossExpense += amount;
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].grossExpense += amount;
        }
        catMap[catKey].grossExpense += amount;
        catMap[catKey].txCount += 1;
      } else if (tx.type === "refund") {
        baseTxCount += 1;
        totalRefunds += amount;
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].refunds += amount;
        }
        catMap[catKey].refunds += amount;
        catMap[catKey].txCount += 1;
      }
      // Transfers are zero-sum and intentionally ignored
    }
  });

  // 4. Compute Final Summary Metrics for CURRENT period
  const rawNetExpense = grossExpense - totalRefunds;
  const effectiveExpense = Math.max(0, rawNetExpense);
  const netCashFlow = totalIncome - effectiveExpense;
  const savingsRate =
    totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

  const summary: AnalyticsSummary = {
    totalIncome,
    grossExpense,
    totalRefunds,
    rawNetExpense,
    effectiveExpense,
    netCashFlow,
    savingsRate,
    txCount: baseTxCount,
    foreignTxCount,
    foreignCurrencies,
  };

  // Compute Final Summary Metrics for PREVIOUS period
  const prevRawNetExpense = prevGrossExpense - prevTotalRefunds;
  const prevEffectiveExpense = Math.max(0, prevRawNetExpense);
  const prevNetCashFlow = prevTotalIncome - prevEffectiveExpense;
  const prevSavingsRate =
    prevTotalIncome > 0 ? (prevNetCashFlow / prevTotalIncome) * 100 : 0;

  const previousPeriodSummary: AnalyticsSummary = {
    totalIncome: prevTotalIncome,
    grossExpense: prevGrossExpense,
    totalRefunds: prevTotalRefunds,
    rawNetExpense: prevRawNetExpense,
    effectiveExpense: prevEffectiveExpense,
    netCashFlow: prevNetCashFlow,
    savingsRate: prevSavingsRate,
    txCount: prevBaseTxCount,
    foreignTxCount: prevForeignTxCount,
    foreignCurrencies: prevForeignCurrencies,
  };

  // 5. Finalize Monthly Trend Points
  const monthlyTrend: MonthlyTrendPoint[] = period.months.map((m) => {
    const bucket = monthlyMap[m.key];
    const bRawNet = bucket.grossExpense - bucket.refunds;
    const bEffective = Math.max(0, bRawNet);
    const bNetFlow = bucket.income - bEffective;

    return {
      ...bucket,
      rawNetExpense: bRawNet,
      effectiveExpense: bEffective,
      netCashFlow: bNetFlow,
    };
  });

  // 6. Finalize Category Breakdown
  const categoryBreakdownList: CategoryExpenseItem[] = [];
  let totalEffectiveForPercentages = 0;

  Object.values(catMap).forEach((item) => {
    if (item.grossExpense > 0 || item.refunds > 0) {
      const cRawNet = item.grossExpense - item.refunds;
      const cEffective = Math.max(0, cRawNet);
      totalEffectiveForPercentages += cEffective;

      categoryBreakdownList.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,
        categoryColor: item.categoryColor,
        isSystem: item.isSystem,
        grossExpense: item.grossExpense,
        refunds: item.refunds,
        rawNetExpense: cRawNet,
        effectiveExpense: cEffective,
        percentageOfTotal: 0, // Assigned below
        txCount: item.txCount,
      });
    }
  });

  // Assign percentages and sort descending by effectiveExpense
  categoryBreakdownList.forEach((item) => {
    item.percentageOfTotal =
      totalEffectiveForPercentages > 0
        ? (item.effectiveExpense / totalEffectiveForPercentages) * 100
        : 0;
  });
  categoryBreakdownList.sort(
    (a, b) => b.effectiveExpense - a.effectiveExpense
  );

  // 7. Reconcile Budget vs Actual
  // Filter budgets to only those that fall within the exact month/year list of the period
  const validPeriodMonthKeys = new Set(period.months.map((m) => m.key));
  const activeBudgets = rawBudgets.filter((b) =>
    validPeriodMonthKeys.has(`${b.year}-${String(b.month).padStart(2, "0")}`)
  );

  // Group budgets by category_id across the period (SUM multi-month budgets)
  const budgetSumMap: Record<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      budgetedAmount: number;
    }
  > = {};

  activeBudgets.forEach((b) => {
    if (!budgetSumMap[b.category_id]) {
      const catMeta = catMap[b.category_id];
      budgetSumMap[b.category_id] = {
        categoryId: b.category_id,
        categoryName: b.category?.name || catMeta?.categoryName || "Expense",
        categoryIcon: b.category?.icon || catMeta?.categoryIcon || "Tag",
        categoryColor: b.category?.color || catMeta?.categoryColor || "#64748b",
        budgetedAmount: 0,
      };
    }
    budgetSumMap[b.category_id].budgetedAmount += Number(b.amount) || 0;
  });

  const budgetVsActual: BudgetVsActualItem[] = [];
  const budgetedCatIds = new Set<string>();

  Object.values(budgetSumMap).forEach((b) => {
    budgetedCatIds.add(b.categoryId);
    const catSpend = catMap[b.categoryId];
    const rawNetSpent = catSpend ? catSpend.grossExpense - catSpend.refunds : 0;
    const actualSpent = Math.max(0, rawNetSpent);
    const variance = b.budgetedAmount - actualSpent;
    const percentageSpent =
      b.budgetedAmount > 0 ? (actualSpent / b.budgetedAmount) * 100 : 0;

    budgetVsActual.push({
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      categoryIcon: b.categoryIcon,
      categoryColor: b.categoryColor,
      budgetedAmount: b.budgetedAmount,
      actualSpent,
      rawNetSpent,
      variance,
      percentageSpent,
      isOverBudget: actualSpent > b.budgetedAmount,
      hasBudget: true,
    });
  });

  // Sort budget vs actual by percentageSpent descending
  budgetVsActual.sort((a, b) => b.percentageSpent - a.percentageSpent);

  // 8. Find Unbudgeted Expenses (Categories that had spending but no budget)
  const unbudgetedSpending: CategoryExpenseItem[] = categoryBreakdownList.filter(
    (item) => item.categoryId && !budgetedCatIds.has(item.categoryId)
  );

  const hasTransactions = baseTxCount > 0 || foreignTxCount > 0;

  const analyticsDataWithoutInsights: AnalyticsData = {
    period,
    defaultCurrency,
    summary,
    monthlyTrend,
    categoryBreakdown: categoryBreakdownList,
    budgetVsActual,
    unbudgetedSpending,
    hasTransactions,
    previousPeriodSummary,
    previousPeriodLabel: previousPeriod.label,
  };

  // 9. Generate Deterministic Financial Insights
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
