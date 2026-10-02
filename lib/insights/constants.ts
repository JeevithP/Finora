export const INSIGHT_THRESHOLDS = {
  // Spending Increase
  SPENDING_INCREASE_MIN_AMOUNT: 500, // Minimum absolute increase in base currency to trigger
  SPENDING_INCREASE_MIN_PERCENT: 10, // Minimum percentage increase (10%) to trigger
  SPENDING_INCREASE_WARNING_PERCENT: 25, // Percentage increase (25%) considered warning level
  SPENDING_INCREASE_WARNING_AMOUNT: 2000, // Minimum absolute increase for warning level

  // Largest Expense Category
  LARGEST_EXPENSE_MIN_PERCENT: 20, // Minimum share of total expenses (20%) to highlight
  LARGEST_EXPENSE_WARNING_PERCENT: 50, // High concentration (50%) considered warning level

  // Savings Rate
  SAVINGS_RATE_MODERATE_PERCENT: 10, // Moderate savings rate threshold (10%)
  SAVINGS_RATE_POSITIVE_PERCENT: 20, // Positive savings rate threshold (20%)

  // Display Limit in UI
  MAX_DISPLAYED_INSIGHTS: 4,
} as const;

export const INSIGHT_PRIORITIES = {
  BUDGET_EXCEEDED: 100,
  NEGATIVE_CASH_FLOW: 90,
  SPENDING_INCREASE: 70,
  SAVINGS_RATE: 60,
  POSITIVE_CASH_FLOW: 50,
  LARGEST_EXPENSE_CATEGORY: 40,
} as const;
