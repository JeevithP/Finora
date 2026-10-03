"use client";

import React from "react";
import Link from "next/link";
import { Plus, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  displayName: string;
  onboardingState?: "NO_ACCOUNTS" | "ACCOUNTS_NO_TRANSACTIONS" | "ACTIVE_USER";
  onAddTransaction: () => void;
  onAddAccount?: () => void;
}

export function DashboardHeader({
  displayName,
  onboardingState = "ACTIVE_USER",
  onAddTransaction,
  onAddAccount,
}: DashboardHeaderProps) {
  // Brand new user with 0 accounts
  if (onboardingState === "NO_ACCOUNTS") {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first financial account to begin tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onAddAccount ? (
            <Button
              onClick={onAddAccount}
              size="sm"
              className="gap-1.5 shadow-xs h-9 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Account</span>
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  // User with accounts but 0 transactions
  if (onboardingState === "ACCOUNTS_NO_TRANSACTIONS") {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your accounts are configured. Record your first transaction to activate your ledger.
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
            className="gap-1.5 shadow-xs h-9 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Record Transaction</span>
          </Button>
        </div>
      </div>
    );
  }

  // Active User with transactions
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
          className="gap-1.5 shadow-xs h-9 text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </Button>
      </div>
    </div>
  );
}
