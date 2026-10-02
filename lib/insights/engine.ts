import { AnalyticsData, AnalyticsSummary } from "@/lib/analytics/types";
import { FinancialInsight } from "./types";
import {
  evaluateBudgetExceeded,
  evaluateCashFlow,
  evaluateLargestExpenseCategory,
  evaluateSavingsRate,
  evaluateSpendingIncrease,
} from "./rules";

/**
 * Pure, deterministic Financial Insights Engine.
 * Evaluates all 6 insight rules and returns the ranked list sorted by:
 * priority DESC -> relevantAmount DESC -> categoryName ASC -> id ASC
 */
export function generateFinancialInsights(
  data: AnalyticsData,
  previousSummary?: AnalyticsSummary | null,
  previousLabel: string = "prior period",
  currency: string = data.defaultCurrency || "INR"
): FinancialInsight[] {
  const allInsights: FinancialInsight[] = [];

  // Rule 1: Budget Exceeded
  allInsights.push(...evaluateBudgetExceeded(data.budgetVsActual, currency));

  // Rule 2: Largest Expense Category
  allInsights.push(
    ...evaluateLargestExpenseCategory(data.categoryBreakdown, data.summary, currency)
  );

  // Rule 3 & 4: Cash Flow (Negative or Positive)
  allInsights.push(...evaluateCashFlow(data.summary, currency));

  // Rule 5: Spending Increase vs Previous Period
  if (previousSummary) {
    allInsights.push(
      ...evaluateSpendingIncrease(
        data.summary,
        previousSummary,
        previousLabel,
        currency
      )
    );
  }

  // Rule 6: Savings Rate
  allInsights.push(...evaluateSavingsRate(data.summary, currency));

  // Deterministic multi-level tie-breaking:
  // 1. priority DESC
  // 2. relevantAmount DESC
  // 3. categoryName ASC
  // 4. id ASC
  return allInsights.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (b.relevantAmount !== a.relevantAmount) {
      return b.relevantAmount - a.relevantAmount;
    }
    const catA = a.categoryName || "";
    const catB = b.categoryName || "";
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }
    return a.id.localeCompare(b.id);
  });
}
