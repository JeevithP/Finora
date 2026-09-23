import React from "react";
import { TrendingUp, ArrowDownRight, Layers, Info } from "lucide-react";
import { Account } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface AccountSummaryCardsProps {
  accounts: Account[];
  defaultCurrency?: string;
}

export function AccountSummaryCards({
  accounts,
  defaultCurrency = "INR",
}: AccountSummaryCardsProps) {
  const activeAccounts = accounts.filter((a) => !a.is_archived);

  // Filter accounts strictly by the user's primary/reporting currency
  const reportingAccounts = activeAccounts.filter(
    (a) => a.currency === defaultCurrency
  );
  const otherCurrencyAccounts = activeAccounts.filter(
    (a) => a.currency !== defaultCurrency
  );

  // Asset accounts: checking, savings, cash, investment in reporting currency
  const assetTypes = ["checking", "savings", "cash", "investment"];
  const totalAssets = reportingAccounts
    .filter((a) => assetTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  // Liability accounts: credit_card, loan in reporting currency
  const liabilityTypes = ["credit_card", "loan"];
  const totalLiabilities = reportingAccounts
    .filter((a) => liabilityTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  // Net Balance / Net Worth in reporting currency
  const netWorth = totalAssets - totalLiabilities;

  const otherCurrencyCodes = Array.from(
    new Set(otherCurrencyAccounts.map((a) => a.currency))
  ).join(", ");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Assets */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Assets ({defaultCurrency})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatCurrency(totalAssets, defaultCurrency)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {
                  reportingAccounts.filter((a) => assetTypes.includes(a.type))
                    .length
                }{" "}
                active {defaultCurrency} asset account(s)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Liabilities */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Liabilities (Debt)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatCurrency(totalLiabilities, defaultCurrency)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {
                  reportingAccounts.filter((a) =>
                    liabilityTypes.includes(a.type)
                  ).length
                }{" "}
                {defaultCurrency} liability account(s)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance / Net Worth */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Net Balance ({defaultCurrency})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div
                className={`text-2xl font-bold tracking-tight ${
                  netWorth >= 0 ? "text-foreground" : "text-rose-600"
                }`}
              >
                {formatCurrency(netWorth, defaultCurrency)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Assets minus liabilities
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Currency Informational Notice */}
      {otherCurrencyAccounts.length > 0 && (
        <div className="flex items-start sm:items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5 sm:mt-0" />
          <span>
            Summary totals reflect <strong>{defaultCurrency}</strong> accounts only.{" "}
            {otherCurrencyAccounts.length} account(s) in other currencies (
            <strong>{otherCurrencyCodes}</strong>) are excluded from aggregate totals to avoid misleading currency conversion. Multi-currency exchange rate conversion will be supported in a future update.
          </span>
        </div>
      )}
    </div>
  );
}
