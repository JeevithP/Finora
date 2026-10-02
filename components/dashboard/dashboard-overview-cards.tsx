"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardOverviewCardsProps {
  netWorth: number;
  activeAccountsCount: number;
  totalIncome: number;
  effectiveExpense: number;
  rawNetExpense: number;
  totalRefunds: number;
  netCashFlow: number;
  savingsRate: number;
  defaultCurrency?: string;
}

export function DashboardOverviewCards({
  netWorth,
  activeAccountsCount,
  totalIncome,
  effectiveExpense,
  totalRefunds,
  netCashFlow,
  savingsRate,
  defaultCurrency = "INR",
}: DashboardOverviewCardsProps) {
  const isPositiveCashFlow = netCashFlow >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Net Balance / Net Worth */}
      <Card className="border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Net Worth
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                netWorth >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(netWorth, defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {activeAccountsCount} active account{activeAccountsCount === 1 ? "" : "s"}
              </p>
              <Link
                href="/accounts"
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Accounts</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Monthly Income */}
      <Card className="border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Monthly Income
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIncome, defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Current month inflows
              </p>
              <Link
                href="/analytics"
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Monthly Expenses */}
      <Card className="border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Monthly Expenses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrency(effectiveExpense, defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {totalRefunds > 0
                  ? `Net (${formatCurrency(totalRefunds, defaultCurrency)} refunds)`
                  : "Current month spend"}
              </p>
              <Link
                href="/analytics"
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Net Cash Flow & Savings Rate */}
      <Card className="border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Net Cash Flow
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isPositiveCashFlow
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositiveCashFlow ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                isPositiveCashFlow
                  ? "text-foreground"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositiveCashFlow ? "+" : ""}
              {formatCurrency(netCashFlow, defaultCurrency)}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4 font-normal ${
                  savingsRate > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Savings rate: {Math.max(0, Math.round(savingsRate))}%
              </Badge>
              <Link
                href="/analytics"
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Trends</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
