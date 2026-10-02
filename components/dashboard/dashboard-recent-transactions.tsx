"use client";

import React from "react";
import Link from "next/link";
import {
  Receipt,
  ArrowRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import { TransactionWithRelations } from "@/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardRecentTransactionsProps {
  transactions?: TransactionWithRelations[];
  defaultCurrency?: string;
  onAddTransaction: () => void;
}

export function DashboardRecentTransactions({
  transactions = [],
  defaultCurrency = "INR",
  onAddTransaction,
}: DashboardRecentTransactionsProps) {
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium px-1.5 py-0 h-4"
          >
            <ArrowUpRight className="h-2.5 w-2.5" />
            <span>Income</span>
          </Badge>
        );
      case "expense":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-medium px-1.5 py-0 h-4"
          >
            <ArrowDownLeft className="h-2.5 w-2.5" />
            <span>Expense</span>
          </Badge>
        );
      case "transfer":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-medium px-1.5 py-0 h-4"
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
            <span>Transfer</span>
          </Badge>
        );
      case "refund":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium px-1.5 py-0 h-4"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Refund</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {type}
          </Badge>
        );
    }
  };

  const renderAmount = (tx: TransactionWithRelations) => {
    const currency = tx.account?.currency || defaultCurrency;
    const formatted = formatCurrency(tx.amount, currency);

    if (tx.type === "income" || tx.type === "refund") {
      return (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatted}
        </span>
      );
    }
    if (tx.type === "expense") {
      return (
        <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
          -{formatted}
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
        {formatted}
      </span>
    );
  };

  return (
    <Card className="border-border/80 bg-card shadow-2xs h-full flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                  Recent Transactions
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest entries in your financial ledger
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <Link href="/transactions">
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  No transactions recorded yet
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                  Add your first transaction to start populating your financial charts and insights.
                </p>
              </div>
              <Button
                onClick={onAddTransaction}
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Transaction</span>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-foreground truncate max-w-[170px] sm:max-w-[240px]">
                          {tx.description || "Untitled Transaction"}
                        </span>
                        {renderTypeBadge(tx.type)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{formatDate(tx.date, "dd MMM yyyy")}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">
                          {tx.type === "transfer"
                            ? `${tx.account?.name} → ${tx.destination_account?.name}`
                            : tx.category?.name || tx.account?.name || "General"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    {renderAmount(tx)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      {transactions.length > 0 && (
        <div className="p-4 pt-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1 shadow-2xs"
          >
            <Link href="/transactions">
              <span>Go to Full Transaction Ledger</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
