"use client";

import React from "react";
import Link from "next/link";
import { Landmark, ArrowRight, Plus } from "lucide-react";
import { Account } from "@/types/database.types";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardAccountsSnapshotProps {
  accounts: Account[];
  defaultCurrency?: string;
  onAddAccount?: () => void;
}

export function DashboardAccountsSnapshot({
  accounts = [],
  defaultCurrency = "INR",
  onAddAccount,
}: DashboardAccountsSnapshotProps) {
  const activeAccounts = accounts.filter((a) => !a.is_archived);

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Accounts Snapshot
              </CardTitle>
              <CardDescription className="text-xs">
                Active asset and liability balances
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Link href="/accounts">
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {activeAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                No accounts created yet
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                Add your bank, credit card, cash, or investment accounts to begin tracking.
              </p>
            </div>
            {onAddAccount ? (
              <Button
                onClick={onAddAccount}
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Account</span>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 shadow-2xs"
              >
                <Link href="/accounts">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Account</span>
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activeAccounts.slice(0, 5).map((account) => {
              const isLiability =
                account.type === "credit_card" || account.type === "loan";
              const balance = Number(account.current_balance);
              const currency = account.currency || defaultCurrency;

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: account.color || "#3b82f6" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {account.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {account.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        isLiability && balance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }`}
                    >
                      {formatCurrency(balance, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
