export type InsightType =
  | "budget_exceeded"
  | "largest_expense_category"
  | "negative_cash_flow"
  | "positive_cash_flow"
  | "spending_increase"
  | "savings_rate";

export type InsightSeverity = "warning" | "info" | "positive";

export interface InsightAction {
  label: string;
  href: string;
}

export interface InsightMetadata {
  amount?: number;
  targetAmount?: number;
  variance?: number;
  percentage?: number;
  categoryId?: string | null;
  categoryName?: string;
  previousAmount?: number;
  currentAmount?: number;
  [key: string]: unknown;
}

export interface FinancialInsight {
  /** Deterministic unique identifier */
  id: string;

  /** Rule identifier */
  type: InsightType;

  /** Visual & semantic severity */
  severity: InsightSeverity;

  /** Numeric sort weight (higher = rendered first) */
  priority: number;

  /** Relevant primary monetary or numeric metric for deterministic tie-breaking */
  relevantAmount: number;

  /** Category name if applicable for deterministic tie-breaking */
  categoryName?: string;

  /** Short headline summary */
  title: string;

  /** Concise, human-friendly explanation with formatted values */
  message: string;

  /** Strongly-typed numerical payload for programmatic access */
  metadata: InsightMetadata;

  /** Optional deep-link for direct user remediation */
  action?: InsightAction;
}
