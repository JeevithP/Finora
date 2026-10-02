"use client";

import React from "react";
import Link from "next/link";
import { Plus, Landmark, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  displayName: string;
  onAddTransaction: () => void;
}

export function DashboardHeader({
  displayName,
  onAddTransaction,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is your financial snapshot and recent ledger activity for this month.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5 shadow-2xs h-9 text-xs"
        >
          <Link href="/accounts">
            <Landmark className="h-3.5 w-3.5" />
            <span>Manage Accounts</span>
          </Link>
        </Button>
        <Button
          onClick={onAddTransaction}
          size="sm"
          className="gap-1.5 shadow-2xs h-9 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </Button>
      </div>
    </div>
  );
}
