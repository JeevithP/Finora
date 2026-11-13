"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/auth/cached";
import { getAnalyticsData } from "@/lib/analytics/queries";
import { AnalyticsPeriodKey } from "@/lib/analytics/types";
import { escapeCsvField, UTF8_BOM, CSV_LINE_BREAK } from "@/lib/csv";
import {
  isValidDateString,
  getCalendarDayDifference,
  MAX_CUSTOM_PERIOD_DAYS,
} from "@/lib/analytics/periods";

export interface ExportReportInput {
  periodKey: AnalyticsPeriodKey;
  customFrom?: string;
  customTo?: string;
}

export interface ExportReportResult {
  success: boolean;
  csvContent?: string;
  filename?: string;
  error?: string;
}

/**
 * Generates an executive-level Financial & Expense Report as an RFC 4180 CSV
 * with UTF-8 BOM encoding for complete spreadsheet compatibility and defense against
 * spreadsheet formula injection (CWE-1236).
 */
export async function exportFinancialReportAction(
  input: ExportReportInput
): Promise<ExportReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: valid session required",
      };
    }

    // Independent server-side validation for date ranges
    if (input.periodKey === "custom") {
      if (!input.customFrom || !input.customTo) {
        return {
          success: false,
          error: "Both start date and end date are required for a custom date report.",
        };
      }
      if (!isValidDateString(input.customFrom)) {
        return {
          success: false,
          error: `Invalid start date "${input.customFrom}". Must be a valid calendar date in YYYY-MM-DD format.`,
        };
      }
      if (!isValidDateString(input.customTo)) {
        return {
          success: false,
          error: `Invalid end date "${input.customTo}". Must be a valid calendar date in YYYY-MM-DD format.`,
        };
      }
      if (input.customFrom > input.customTo) {
        return {
          success: false,
          error: "Invalid date range: start date cannot be after end date.",
        };
      }
      const durationDays = getCalendarDayDifference(
        input.customFrom,
        input.customTo
      );
      if (durationDays > MAX_CUSTOM_PERIOD_DAYS) {
        return {
          success: false,
          error: `Date range exceeds maximum limit of 10 years (${MAX_CUSTOM_PERIOD_DAYS} days).`,
        };
      }
    }

    const profile = await getUserProfile(user.id);
    const defaultCurrency = profile?.default_currency || "INR";

    const analytics = await getAnalyticsData(
      user.id,
      defaultCurrency,
      input.periodKey,
      true, // Include trend & unbudgeted
      input.customFrom,
      input.customTo
    );

    // Fetch non-expense balance-sheet cash movements (transfers & loan repayments)
    // PostgREST/Supabase defaults to a maximum returned-row ceiling (typically 1,000 rows).
    // We paginate across pages using deterministic .order("id") and .range() to ensure
    // every matching record is included without silent truncation, even for multi-year custom ranges.
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    let totalPrincipalRepaid = 0;
    let totalTransfers = 0;

    while (hasMore) {
      const { data: pageRows, error: pageError } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user.id)
        .in("type", ["loan_repayment", "transfer"])
        .gte("date", analytics.period.startDate)
        .lt("date", analytics.period.endDateExclusive)
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (pageError) {
        console.error(
          "Failed to load supplementary transactions for report:",
          pageError
        );
        return {
          success: false,
          error:
            "Failed to retrieve supplementary financial records for report generation.",
        };
      }

      for (const row of pageRows || []) {
        if (row.type === "loan_repayment") {
          totalPrincipalRepaid += Number(row.amount || 0);
        } else if (row.type === "transfer") {
          totalTransfers += Number(row.amount || 0);
        }
      }

      if (!pageRows || pageRows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const lines: string[] = [];

    // Header & Metadata
    lines.push(escapeCsvField("FINORA FINANCIAL & EXPENSE REPORT", false));
    lines.push(
      `${escapeCsvField("Generated At", false)},${escapeCsvField(nowStr, false)}`
    );
    lines.push(
      `${escapeCsvField("User", false)},${escapeCsvField(
        profile?.full_name || user.email || "Finora User",
        true
      )}`
    );
    lines.push(
      `${escapeCsvField("Reporting Currency", false)},${escapeCsvField(
        defaultCurrency,
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Period", false)},${escapeCsvField(
        analytics.period.label,
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Date Range", false)},${escapeCsvField(
        `${analytics.period.startDate} to ${analytics.period.endDateExclusive} (exclusive)`,
        false
      )}`
    );
    lines.push("");

    // Section 1: Executive Financial Summary
    lines.push(escapeCsvField("1. EXECUTIVE FINANCIAL SUMMARY", false));
    lines.push(
      `${escapeCsvField("Metric", false)},${escapeCsvField(
        `Amount (${defaultCurrency})`,
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Total Income", false)},${escapeCsvField(
        analytics.summary.totalIncome.toFixed(2),
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Gross Expenses", false)},${escapeCsvField(
        analytics.summary.grossExpense.toFixed(2),
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Total Refunds", false)},${escapeCsvField(
        analytics.summary.totalRefunds.toFixed(2),
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Net Effective Expense", false)},${escapeCsvField(
        analytics.summary.effectiveExpense.toFixed(2),
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Net Cash Flow", false)},${escapeCsvField(
        analytics.summary.netCashFlow.toFixed(2),
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Savings Rate", false)},${escapeCsvField(
        `${analytics.summary.savingsRate.toFixed(2)}%`,
        false
      )}`
    );
    lines.push(
      `${escapeCsvField("Total Transactions", false)},${escapeCsvField(
        analytics.summary.txCount.toString(),
        false
      )}`
    );
    if (totalPrincipalRepaid > 0) {
      lines.push(
        `${escapeCsvField(
          "Loan Principal Repayments (Debt Reduction)",
          false
        )},${escapeCsvField(totalPrincipalRepaid.toFixed(2), false)}`
      );
    }
    if (totalTransfers > 0) {
      lines.push(
        `${escapeCsvField(
          "Transfers & Card Payments (Balance Sheet Moves)",
          false
        )},${escapeCsvField(totalTransfers.toFixed(2), false)}`
      );
    }
    lines.push(
      `${escapeCsvField(
        "Accounting Principles",
        false
      )},${escapeCsvField(
        "Refunds reduce net expenses. Transfers, card payments, and loan principal repayments shift balances and are excluded from expenses.",
        false
      )}`
    );
    if (analytics.summary.foreignTxCount > 0) {
      lines.push(
        `${escapeCsvField(
          "Foreign Currency Transactions (Excluded)",
          false
        )},${escapeCsvField(
          analytics.summary.foreignTxCount.toString(),
          false
        )}`
      );
    }
    lines.push("");

    // Section 2: Category Expense Breakdown
    lines.push(escapeCsvField("2. CATEGORY EXPENSE BREAKDOWN", false));
    lines.push(
      [
        escapeCsvField("Category", false),
        escapeCsvField(`Gross Spent (${defaultCurrency})`, false),
        escapeCsvField(`Refunds (${defaultCurrency})`, false),
        escapeCsvField(`Effective Expense (${defaultCurrency})`, false),
        escapeCsvField("% of Total Expense", false),
        escapeCsvField("Transaction Count", false),
      ].join(",")
    );

    if (analytics.categoryBreakdown.length === 0) {
      lines.push(
        `${escapeCsvField(
          "No category expense records found for this period",
          false
        )},,,,,`
      );
    } else {
      for (const cat of analytics.categoryBreakdown) {
        lines.push(
          [
            escapeCsvField(cat.categoryName, true),
            escapeCsvField(cat.grossExpense.toFixed(2), false),
            escapeCsvField(cat.refunds.toFixed(2), false),
            escapeCsvField(cat.effectiveExpense.toFixed(2), false),
            escapeCsvField(`${cat.percentageOfTotal.toFixed(2)}%`, false),
            escapeCsvField(cat.txCount.toString(), false),
          ].join(",")
        );
      }
    }
    lines.push("");

    // Section 3: Budget vs Actual Performance
    const isProrated = Boolean(
      analytics.period.isCustom && analytics.period.isPartialBudget
    );
    const budgetSectionTitle = isProrated
      ? "3. BUDGET PERFORMANCE & VARIANCES (Prorated for Custom Date Range)"
      : "3. BUDGET PERFORMANCE & VARIANCES (Full Month Basis)";
    lines.push(escapeCsvField(budgetSectionTitle, false));

    if (isProrated) {
      lines.push(
        `${escapeCsvField(
          "Budget Basis",
          false
        )},${escapeCsvField(
          "Monthly budgets are prorated by calendar days for partial months within the selected date range.",
          false
        )},,,,`
      );
    }

    const budgetColHeader = isProrated
      ? `Prorated Budget (${defaultCurrency})`
      : `Budgeted (${defaultCurrency})`;

    lines.push(
      [
        escapeCsvField("Category", false),
        escapeCsvField(budgetColHeader, false),
        escapeCsvField(`Actual Spent (${defaultCurrency})`, false),
        escapeCsvField(`Variance (${defaultCurrency})`, false),
        escapeCsvField("% Spent", false),
        escapeCsvField("Status", false),
      ].join(",")
    );

    const activeBudgets = analytics.budgetVsActual.filter((b) => b.hasBudget);

    if (activeBudgets.length === 0) {
      lines.push(
        `${escapeCsvField(
          "No active budgets configured for this period",
          false
        )},,,,,`
      );
    } else {
      for (const b of activeBudgets) {
        const status = b.isOverBudget ? "Over Budget" : "Within Budget";
        lines.push(
          [
            escapeCsvField(b.categoryName, true),
            escapeCsvField(b.budgetedAmount.toFixed(2), false),
            escapeCsvField(b.actualSpent.toFixed(2), false),
            escapeCsvField(b.variance.toFixed(2), false),
            escapeCsvField(`${b.percentageSpent.toFixed(2)}%`, false),
            escapeCsvField(status, false),
          ].join(",")
        );
      }
    }
    lines.push("");

    // Section 4: Monthly Trend Aggregates (if multi-month)
    if (analytics.monthlyTrend.length > 1) {
      lines.push(escapeCsvField("4. MONTHLY CASH FLOW TREND", false));
      lines.push(
        [
          escapeCsvField("Month", false),
          escapeCsvField(`Income (${defaultCurrency})`, false),
          escapeCsvField(`Gross Expense (${defaultCurrency})`, false),
          escapeCsvField(`Refunds (${defaultCurrency})`, false),
          escapeCsvField(`Effective Expense (${defaultCurrency})`, false),
          escapeCsvField(`Net Cash Flow (${defaultCurrency})`, false),
        ].join(",")
      );

      for (const m of analytics.monthlyTrend) {
        lines.push(
          [
            escapeCsvField(m.label, false),
            escapeCsvField(m.income.toFixed(2), false),
            escapeCsvField(m.grossExpense.toFixed(2), false),
            escapeCsvField(m.refunds.toFixed(2), false),
            escapeCsvField(m.effectiveExpense.toFixed(2), false),
            escapeCsvField(m.netCashFlow.toFixed(2), false),
          ].join(",")
        );
      }
      lines.push("");
    }

    // Prepend UTF-8 BOM for Microsoft Excel / spreadsheet compatibility and join with CRLF
    const csvContent = UTF8_BOM + lines.join(CSV_LINE_BREAK);

    const filePeriodStr =
      input.periodKey === "custom" && input.customFrom && input.customTo
        ? `${input.customFrom}-to-${input.customTo}`
        : input.periodKey.replace(/_/g, "-");

    const filename = `finora-financial-report-${filePeriodStr}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (err: unknown) {
    console.error("Failed to generate financial report:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to generate financial report",
    };
  }
}
