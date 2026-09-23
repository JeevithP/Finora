"use client";

import React from "react";
import { Landmark, ArrowDownRight, Archive, Plus } from "lucide-react";
import { Account } from "@/types/database.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AccountCard } from "./account-card";
import { AccountEmptyState } from "./account-empty-state";
import { CreateAccountDialog } from "./create-account-dialog";
import { Button } from "@/components/ui/button";

interface AccountGridProps {
  accounts: Account[];
  defaultCurrency?: string;
  transactionCounts?: Record<string, number>;
}

export function AccountGrid({
  accounts,
  defaultCurrency = "INR",
  transactionCounts = {},
}: AccountGridProps) {
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const archivedAccounts = accounts.filter((a) => a.is_archived);

  const assetTypes = ["checking", "savings", "cash", "investment"];
  const assetAccounts = activeAccounts.filter((a) => assetTypes.includes(a.type));
  const liabilityAccounts = activeAccounts.filter((a) =>
    ["credit_card", "loan"].includes(a.type)
  );

  if (accounts.length === 0) {
    return <AccountEmptyState defaultCurrency={defaultCurrency} />;
  }

  return (
    <Tabs defaultValue="active" className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs switcher */}
        <TabsList className="h-10 bg-muted/60 p-1">
          <TabsTrigger value="active" className="gap-2 text-xs">
            <span>Active Accounts</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 h-4 text-[10px] font-mono"
            >
              {activeAccounts.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="archived" className="gap-2 text-xs">
            <span>Archived</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 h-4 text-[10px] font-mono"
            >
              {archivedAccounts.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <CreateAccountDialog defaultCurrency={defaultCurrency} />
        </div>
      </div>

      {/* ACTIVE ACCOUNTS TAB */}
      <TabsContent value="active" className="space-y-8 outline-none mt-0">
        {activeAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              All accounts are currently archived.
            </p>
          </div>
        ) : (
          <>
            {/* Asset Accounts Section */}
            {assetAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                    <Landmark className="h-3.5 w-3.5" />
                  </div>
                  <span>Asset Accounts</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({assetAccounts.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assetAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      transactionCount={transactionCounts[account.id] || 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Liability Accounts Section */}
            {liabilityAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </div>
                  <span>Liabilities & Credit Accounts</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({liabilityAccounts.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {liabilityAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      transactionCount={transactionCounts[account.id] || 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* ARCHIVED ACCOUNTS TAB */}
      <TabsContent value="archived" className="space-y-4 outline-none mt-0">
        {archivedAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted mx-auto mb-2 text-muted-foreground">
              <Archive className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No Archived Accounts
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Archived accounts will appear here to maintain historical ledger integrity.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                transactionCount={transactionCounts[account.id] || 0}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
