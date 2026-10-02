import { formatCurrency, formatPercentage } from "@/lib/formatters";
import {
  AnalyticsSummary,
  BudgetVsActualItem,
  CategoryExpenseItem,
} from "@/lib/analytics/types";
import { FinancialInsight } from "./types";
import { INSIGHT_PRIORITIES, INSIGHT_THRESHOLDS } from "./constants";

/**
 * 1. Budget Exceeded Rule
 * Evaluates any categories where actual spent > budgeted amount.
 */
export function evaluateBudgetExceeded(
  budgets: BudgetVsActualItem[],
  currency: string
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  for (const item of budgets) {
    if (item.isOverBudget && item.budgetedAmount > 0 && item.actualSpent > item.budgetedAmount) {
      const overspendVariance = item.actualSpent - item.budgetedAmount;

      insights.push({
        id: `budget_exceeded_${item.categoryId}`,
        type: "budget_exceeded",
        severity: "warning",
        priority: INSIGHT_PRIORITIES.BUDGET_EXCEEDED,
        relevantAmount: overspendVariance,
        categoryName: item.categoryName,
        title: `Budget Exceeded: ${item.categoryName}`,
        message: `Spent ${formatCurrency(item.actualSpent, currency)} against a planned budget of ${formatCurrency(item.budgetedAmount, currency)} (${formatPercentage(item.percentageSpent)} spent, ${formatCurrency(overspendVariance, currency)} over).`,
        metadata: {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          amount: item.actualSpent,
          targetAmount: item.budgetedAmount,
          variance: overspendVariance,
          percentage: item.percentageSpent,
        },
        action: {
          label: "Manage Budgets",
          href: "/budgets",
        },
      });
    }
  }

  return insights;
}

/**
 * 2. Largest Expense Category Rule
 * Highlights the category representing the largest share of expenses if >= 20%.
 */
export function evaluateLargestExpenseCategory(
  categories: CategoryExpenseItem[],
  summary: AnalyticsSummary,
  currency: string
): FinancialInsight[] {
  if (categories.length === 0 || summary.effectiveExpense <= 0) {
    return [];
  }

  // Categories are pre-sorted descending by effectiveExpense in M7
  const topCategory = categories[0];
  if (
    !topCategory ||
    topCategory.effectiveExpense <= 0 ||
    topCategory.percentageOfTotal < INSIGHT_THRESHOLDS.LARGEST_EXPENSE_MIN_PERCENT
  ) {
    return [];
  }

  const isWarning =
    topCategory.percentageOfTotal >= INSIGHT_THRESHOLDS.LARGEST_EXPENSE_WARNING_PERCENT;

  return [
    {
      id: `largest_expense_category_${topCategory.categoryId || "uncategorized"}`,
      type: "largest_expense_category",
      severity: isWarning ? "warning" : "info",
      priority: INSIGHT_PRIORITIES.LARGEST_EXPENSE_CATEGORY,
      relevantAmount: topCategory.effectiveExpense,
      categoryName: topCategory.categoryName,
      title: `Top Spending: ${topCategory.categoryName}`,
      message: `${topCategory.categoryName} is your largest expense at ${formatCurrency(topCategory.effectiveExpense, currency)}, accounting for ${formatPercentage(topCategory.percentageOfTotal)} of total spending.`,
      metadata: {
        categoryId: topCategory.categoryId,
        categoryName: topCategory.categoryName,
        amount: topCategory.effectiveExpense,
        percentage: topCategory.percentageOfTotal,
      },
      action: {
        label: "View Transactions",
        href: "/transactions",
      },
    },
  ];
}

/**
 * 3 & 4. Cash Flow Rules
 * Evaluates negative or positive cash flow for the selected period.
 */
export function evaluateCashFlow(
  summary: AnalyticsSummary,
  currency: string
): FinancialInsight[] {
  // Scenario A: Negative Cash Flow (Expenses > Income)
  if (summary.effectiveExpense > summary.totalIncome && summary.effectiveExpense > 0) {
    const deficit = summary.effectiveExpense - summary.totalIncome;
    return [
      {
        id: "negative_cash_flow",
        type: "negative_cash_flow",
        severity: "warning",
        priority: INSIGHT_PRIORITIES.NEGATIVE_CASH_FLOW,
        relevantAmount: deficit,
        title: "Negative Cash Flow",
        message: `Expenses (${formatCurrency(summary.effectiveExpense, currency)}) exceeded income (${formatCurrency(summary.totalIncome, currency)}) by ${formatCurrency(deficit, currency)}.`,
        metadata: {
          amount: summary.effectiveExpense,
          targetAmount: summary.totalIncome,
          variance: deficit,
        },
        action: {
          label: "Review Expenses",
          href: "/transactions",
        },
      },
    ];
  }

  // Scenario B: Positive Cash Flow (Income > Expenses)
  if (summary.totalIncome > summary.effectiveExpense && summary.totalIncome > 0) {
    const surplus = summary.netCashFlow;
    return [
      {
        id: "positive_cash_flow",
        type: "positive_cash_flow",
        severity: "positive",
        priority: INSIGHT_PRIORITIES.POSITIVE_CASH_FLOW,
        relevantAmount: surplus,
        title: "Positive Cash Flow",
        message: `Net cash surplus of ${formatCurrency(surplus, currency)} (${formatPercentage(summary.savingsRate)} of total income retained).`,
        metadata: {
          amount: surplus,
          percentage: summary.savingsRate,
          currentAmount: summary.totalIncome,
        },
        action: {
          label: "View Trends",
          href: "/analytics",
        },
      },
    ];
  }

  return [];
}

/**
 * 5. Spending Increase Rule
 * Compares current period effective expenses against the equivalent previous period.
 */
export function evaluateSpendingIncrease(
  currentSummary: AnalyticsSummary,
  previousSummary: AnalyticsSummary | null | undefined,
  previousLabel: string,
  currency: string
): FinancialInsight[] {
  if (!previousSummary) {
    return [];
  }

  const currentExpense = currentSummary.effectiveExpense;
  const previousExpense = previousSummary.effectiveExpense;

  if (currentExpense <= previousExpense) {
    return [];
  }

  const deltaAmount = currentExpense - previousExpense;
  if (deltaAmount < INSIGHT_THRESHOLDS.SPENDING_INCREASE_MIN_AMOUNT) {
    return [];
  }

  let pctIncrease = 0;
  let isWarning = false;
  let message = "";

  if (previousExpense > 0) {
    pctIncrease = (deltaAmount / previousExpense) * 100;
    if (pctIncrease < INSIGHT_THRESHOLDS.SPENDING_INCREASE_MIN_PERCENT) {
      return [];
    }
    isWarning =
      pctIncrease >= INSIGHT_THRESHOLDS.SPENDING_INCREASE_WARNING_PERCENT &&
      deltaAmount >= INSIGHT_THRESHOLDS.SPENDING_INCREASE_WARNING_AMOUNT;

    message = `Expenses rose by ${formatCurrency(deltaAmount, currency)} (+${formatPercentage(pctIncrease)}) compared to ${previousLabel} (${formatCurrency(previousExpense, currency)} → ${formatCurrency(currentExpense, currency)}).`;
  } else {
    // Previous period had zero expenses, current period has new spending >= threshold
    isWarning = deltaAmount >= INSIGHT_THRESHOLDS.SPENDING_INCREASE_WARNING_AMOUNT;
    message = `Expenses rose by ${formatCurrency(deltaAmount, currency)} of new spending compared to ${previousLabel}.`;
  }

  return [
    {
      id: "spending_increase",
      type: "spending_increase",
      severity: isWarning ? "warning" : "info",
      priority: INSIGHT_PRIORITIES.SPENDING_INCREASE,
      relevantAmount: deltaAmount,
      title: "Spending Increased vs. Prior Period",
      message,
      metadata: {
        amount: deltaAmount,
        percentage: pctIncrease,
        currentAmount: currentExpense,
        previousAmount: previousExpense,
      },
      action: {
        label: "Compare Breakdown",
        href: "/analytics",
      },
    },
  ];
}

/**
 * 6. Savings Rate Rule
 * Evaluates savings rate when total income > 0 and net cash flow >= 0.
 * Purely descriptive messaging without judgmental words ("healthy", "excellent", "recommended", "benchmark", "target").
 */
export function evaluateSavingsRate(
  summary: AnalyticsSummary,
  currency: string
): FinancialInsight[] {
  if (summary.totalIncome <= 0 || summary.netCashFlow < 0) {
    return [];
  }

  const rate = summary.savingsRate;
  let severity: "positive" | "info" | "warning" = "info";

  if (rate >= INSIGHT_THRESHOLDS.SAVINGS_RATE_POSITIVE_PERCENT) {
    severity = "positive";
  } else if (rate < INSIGHT_THRESHOLDS.SAVINGS_RATE_MODERATE_PERCENT) {
    severity = "warning";
  } else {
    severity = "info";
  }

  return [
    {
      id: "savings_rate",
      type: "savings_rate",
      severity,
      priority: INSIGHT_PRIORITIES.SAVINGS_RATE,
      relevantAmount: summary.netCashFlow,
      title: `Savings Rate: ${formatPercentage(rate)}`,
      message: `Savings rate: ${formatPercentage(rate)}. You retained ${formatCurrency(summary.netCashFlow, currency)} from ${formatCurrency(summary.totalIncome, currency)} of income.`,
      metadata: {
        amount: summary.netCashFlow,
        percentage: rate,
        currentAmount: summary.totalIncome,
      },
      action: {
        label: "Manage Budgets",
        href: "/budgets",
      },
    },
  ];
}
