"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Plus, Landmark } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardNextStepsProps {
  accountsCount: number;
  netWorth: number;
  defaultCurrency?: string;
  onAddTransaction: () => void;
}

export function DashboardNextSteps({
  accountsCount,
  netWorth,
  defaultCurrency = "INR",
  onAddTransaction,
}: DashboardNextStepsProps) {
  return (
    <Card className="border-primary/30 bg-linear-to-br from-card via-card to-primary/[0.03] shadow-2xs overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium gap-1 px-2 py-0.5"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Account Setup Complete</span>
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                Next: Ledger Activity
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Ready for your first transaction
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You have configured <strong>{accountsCount} active account{accountsCount === 1 ? "" : "s"}</strong> with an initial tracked net worth of <strong>{formatCurrency(netWorth, defaultCurrency)}</strong>. Record your first transaction to start populating your monthly cash flow, category breakdowns, and smart insights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 text-xs shadow-2xs gap-1.5"
            >
              <Link href="/accounts">
                <Landmark className="h-3.5 w-3.5" />
                <span>View Accounts</span>
              </Link>
            </Button>

            <Button
              onClick={onAddTransaction}
              size="sm"
              className="h-9 text-xs font-semibold shadow-xs gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Record First Transaction</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
