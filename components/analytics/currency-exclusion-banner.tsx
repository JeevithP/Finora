import React from "react";
import { AlertTriangle } from "lucide-react";

interface CurrencyExclusionBannerProps {
  foreignTxCount: number;
  foreignCurrencies: Record<string, number>;
  defaultCurrency: string;
}

export function CurrencyExclusionBanner({
  foreignTxCount,
  foreignCurrencies,
  defaultCurrency,
}: CurrencyExclusionBannerProps) {
  if (foreignTxCount === 0) return null;

  const currencyList = Object.entries(foreignCurrencies)
    .map(([curr, count]) => `${count} ${curr}`)
    .join(", ");

  return (
    <div className="flex items-start sm:items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
      <div>
        <span className="font-semibold">Multi-Currency Notice:</span>{" "}
        <span>
          {foreignTxCount} transaction(s) in non-{defaultCurrency} accounts ({currencyList}) are excluded from standard totals to preserve financial currency integrity.
        </span>
      </div>
    </div>
  );
}
