"use client";

import React from "react";
import {
  Landmark,
  ArrowLeftRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardGettingStartedProps {
  displayName: string;
  onAddAccount: () => void;
}

export function DashboardGettingStarted({
  displayName,
  onAddAccount,
}: DashboardGettingStartedProps) {
  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-primary/[0.04] p-6 sm:p-8 md:p-10 shadow-xs">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-xs font-medium gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Getting Started with Finora</span>
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Welcome, {displayName}! Let&apos;s build your personal financial ledger.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Finora tracks your financial health from the bottom up—starting with your asset and liability accounts, recording authoritative ledger transactions, and automatically generating budgets and intelligent insights.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={onAddAccount}
              size="lg"
              className="gap-2 shadow-xs text-sm font-semibold h-11 px-6"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Account</span>
            </Button>
          </div>
        </div>

        {/* Subtle Background Graphic */}
        <div className="absolute right-4 bottom-4 -mr-8 -mb-8 pointer-events-none opacity-5 dark:opacity-10 sm:block hidden">
          <Landmark className="w-64 h-64 text-primary" />
        </div>
      </div>

      {/* 3-Step Interactive Roadmap */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Your 3-Step Path to Financial Clarity
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete the first step below to begin tracking your net worth and spending.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="list" aria-label="Onboarding Roadmap">
          {/* Step 1: Active */}
          <Card
            role="listitem"
            aria-current="step"
            className="border-primary/40 bg-card shadow-2xs relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">
                  STEP 01
                </span>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2 py-0.5"
                >
                  Action Required
                </Badge>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Create Accounts
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Add your bank accounts, credit cards, cash wallets, or savings accounts with their current balances.
              </CardDescription>

              <Button
                onClick={onAddAccount}
                size="sm"
                className="w-full gap-1.5 text-xs font-medium h-9 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Account</span>
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upcoming */}
          <Card
            role="listitem"
            className="border-border/80 bg-card/60 shadow-none flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  STEP 02
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-normal px-2 py-0.5 text-muted-foreground"
                >
                  Upcoming
                </Badge>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Record Ledger Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Log income, everyday expenses, transfers, and store refunds. Account balances sync automatically.
              </CardDescription>
              <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span>Unlocked after adding an account</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Upcoming */}
          <Card
            role="listitem"
            className="border-border/80 bg-card/60 shadow-none flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  STEP 03
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-normal px-2 py-0.5 text-muted-foreground"
                >
                  Upcoming
                </Badge>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Budgets &amp; Insights
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Set monthly spending plans and discover automated, rule-based insights and cash flow patterns.
              </CardDescription>
              <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span>Generated automatically from ledger activity</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature / Value Preview Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Why Finora?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Authoritative Ledger</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every balance is derived directly from your transactions. No phantom calculations or duplicate sources of truth.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Zap className="h-4 w-4 shrink-0" />
              <span>Automated Balance Triggers</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PostgreSQL database triggers handle balance additions, deductions, transfers, and reversals automatically.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Deterministic Insights</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transparent, rule-based financial analysis detecting spending surges and savings rate metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
