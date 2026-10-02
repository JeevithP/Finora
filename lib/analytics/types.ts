import { FinancialInsight } from "@/lib/insights/types";

export type AnalyticsPeriodKey =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year";

export interface MonthBucket {
  year: number;
  month: number; // 1-12
  key: string; // "YYYY-MM"
  label: string; // "MMM yyyy", e.g., "Oct 2026"
}

export interface PeriodInterval {
  key: AnalyticsPeriodKey;
  label: string;
  startDate: string; // "YYYY-MM-DD"
  endDateExclusive: string; // "YYYY-MM-DD"
  months: MonthBucket[];
}

export interface AnalyticsSummary {
  totalIncome: number;
  grossExpense: number;
  totalRefunds: number;
  rawNetExpense: number; // grossExpense - totalRefunds (can be negative)
  effectiveExpense: number; // Math.max(0, rawNetExpense)
  netCashFlow: number; // totalIncome - effectiveExpense
  savingsRate: number; // (netCashFlow / totalIncome) * 100 or 0
  txCount: number;
  foreignTxCount: number;
  foreignCurrencies: Record<string, number>;
}

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  key: string; // "YYYY-MM"
  label: string; // "MMM yyyy"
  income: number;
  grossExpense: number;
  refunds: number;
  rawNetExpense: number;
  effectiveExpense: number;
  netCashFlow: number;
}

export interface CategoryExpenseItem {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  isSystem: boolean;
  grossExpense: number;
  refunds: number;
  rawNetExpense: number;
  effectiveExpense: number;
  percentageOfTotal: number; // 0 - 100
  txCount: number;
}

export interface BudgetVsActualItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgetedAmount: number; // Sum of budgets in the period
  actualSpent: number; // Effective net spend in period: Math.max(0, rawNetSpent)
  rawNetSpent: number; // Raw expenses - refunds
  variance: number; // budgetedAmount - actualSpent (positive = under budget)
  percentageSpent: number; // (actualSpent / budgetedAmount) * 100
  isOverBudget: boolean;
  hasBudget: boolean;
}

export interface AnalyticsData {
  period: PeriodInterval;
  defaultCurrency: string;
  summary: AnalyticsSummary;
  monthlyTrend: MonthlyTrendPoint[];
  categoryBreakdown: CategoryExpenseItem[];
  budgetVsActual: BudgetVsActualItem[];
  unbudgetedSpending: CategoryExpenseItem[];
  hasTransactions: boolean;
  previousPeriodSummary?: AnalyticsSummary | null;
  previousPeriodLabel?: string;
  insights?: FinancialInsight[];
}
