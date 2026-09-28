"use client";

import React from "react";
import { ArrowLeftRight, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TransactionEmptyStateProps {
  isFiltered?: boolean;
  onResetFilters?: () => void;
  onAddTransaction?: () => void;
}

export function TransactionEmptyState({
  isFiltered = false,
  onResetFilters,
  onAddTransaction,
}: TransactionEmptyStateProps) {
  if (isFiltered) {
    return (
      <Card className="border-dashed border-2 border-border/80 bg-card/50 shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
            <ArrowLeftRight className="h-6 w-6" />
          </div>

          <h3 className="text-base font-semibold text-foreground">
            No matching transactions
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            We couldn&apos;t find any transactions matching your current search or filter criteria.
          </p>

          {onResetFilters && (
            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-border/80 bg-card/50 shadow-none">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <ArrowLeftRight className="h-7 w-7" />
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          No transactions yet
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Transactions will appear here after recording your income, everyday expenses, transfers between accounts, or store refunds.
        </p>

        {onAddTransaction && (
          <div className="mt-6">
            <Button onClick={onAddTransaction} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Add Your First Transaction</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
