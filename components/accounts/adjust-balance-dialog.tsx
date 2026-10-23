"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Scale,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

import { adjustAccountBalanceAction } from "@/actions/accounts";
import { Account } from "@/types/database.types";
import { formatCurrency } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AdjustBalanceDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustBalanceDialog({
  account,
  open,
  onOpenChange,
}: AdjustBalanceDialogProps) {
  const [isSubmitting, startTransition] = useTransition();
  const [mode, setMode] = useState<"current_balance" | "opening_balance">(
    "current_balance"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const isLiability = account.type === "credit_card" || account.type === "loan";
  const currentBal = Number(account.current_balance);
  const initialBal = Number(account.initial_balance);

  // Form states for Mode 2: Reconcile Current Balance
  const [targetBalance, setTargetBalance] = useState<string>(
    String(currentBal)
  );
  const [txDate, setTxDate] = useState<string>(todayStr);
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Form states for Mode 1: Correct Opening Balance
  const [newInitialBalance, setNewInitialBalance] = useState<string>(
    String(initialBal)
  );
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTargetBalance(String(Number(account.current_balance)));
      setNewInitialBalance(String(Number(account.initial_balance)));
      setTxDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setNotes("");
      setReason("");
      setMode("current_balance");
    }
  }, [open, account]);

  // Mode 2 Calculations
  const parsedTarget = parseFloat(targetBalance);
  const isValidTarget = !isNaN(parsedTarget);
  const currentDiff = isValidTarget ? parsedTarget - currentBal : 0;
  const hasCurrentDiff = isValidTarget && Math.abs(currentDiff) > 0.0001;
  const isIncrease = currentDiff > 0;

  // Mode 1 Calculations
  const parsedNewInitial = parseFloat(newInitialBalance);
  const isValidNewInitial = !isNaN(parsedNewInitial);
  const initialDiff = isValidNewInitial ? parsedNewInitial - initialBal : 0;
  const hasInitialDiff = isValidNewInitial && Math.abs(initialDiff) > 0.0001;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "current_balance") {
      if (!isValidTarget) {
        toast.error("Please enter a valid target balance");
        return;
      }
      if (!hasCurrentDiff) {
        toast.error("Target balance is identical to the current balance. No adjustment needed.");
        return;
      }

      startTransition(async () => {
        try {
          const res = await adjustAccountBalanceAction({
            mode: "current_balance",
            accountId: account.id,
            targetCurrentBalance: parsedTarget,
            date: txDate || todayStr,
            description: description.trim(),
            notes: notes.trim() || undefined,
          });

          if (res.success) {
            toast.success(
              `Account "${account.name}" balance reconciled to ${formatCurrency(
                parsedTarget,
                account.currency
              )}`
            );
            onOpenChange(false);
          } else {
            toast.error(res.error || "Failed to adjust balance");
          }
        } catch {
          toast.error("An unexpected error occurred while adjusting balance");
        }
      });
    } else {
      // Opening balance mode
      if (!isValidNewInitial) {
        toast.error("Please enter a valid initial balance");
        return;
      }
      if (!hasInitialDiff) {
        toast.info("New initial balance matches existing initial balance.");
        onOpenChange(false);
        return;
      }

      startTransition(async () => {
        try {
          const res = await adjustAccountBalanceAction({
            mode: "opening_balance",
            accountId: account.id,
            newInitialBalance: parsedNewInitial,
            reason: reason.trim() || undefined,
          });

          if (res.success) {
            toast.success(
              `Account "${account.name}" opening balance corrected to ${formatCurrency(
                parsedNewInitial,
                account.currency
              )}`
            );
            onOpenChange(false);
          } else {
            toast.error(res.error || "Failed to correct opening balance");
          }
        } catch {
          toast.error("An unexpected error occurred while correcting opening balance");
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scale className="h-4 w-4" />
            </div>
            <span>Adjust Account Balance</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Reconcile current balance or fix an opening balance mistake on{" "}
            <span className="font-semibold text-foreground">{account.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(val) => setMode(val as "current_balance" | "opening_balance")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="current_balance" className="text-xs">
              Reconcile Current Balance
            </TabsTrigger>
            <TabsTrigger value="opening_balance" className="text-xs">
              Correct Opening Balance
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* TAB 1: RECONCILE CURRENT BALANCE */}
            <TabsContent value="current_balance" className="space-y-3.5 mt-0">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Recorded Balance:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(currentBal, account.currency)}
                  </span>
                </div>
                {isLiability && (
                  <p className="text-[11px] text-muted-foreground">
                    Note: For loan/credit accounts, balance represents outstanding debt.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-balance" className="text-xs font-medium">
                  Actual / Target Balance ({account.currency}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target-balance"
                  type="number"
                  step="0.01"
                  value={targetBalance}
                  onChange={(e) => setTargetBalance(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono text-sm"
                  required
                />
              </div>

              {/* Live Preview Banner */}
              {hasCurrentDiff && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                    isIncrease
                      ? isLiability
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                      : isLiability
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-200"
                  }`}
                >
                  {isIncrease ? (
                    <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">
                      Adjustment Delta:{" "}
                      <span className="font-mono font-bold">
                        {currentDiff > 0 ? "+" : ""}
                        {formatCurrency(currentDiff, account.currency)}
                      </span>{" "}
                      ({isIncrease ? "Increase" : "Decrease"})
                    </p>
                    <p className="text-[11px] opacity-90">
                      Creates an auditable ledger entry. Excluded from income/expense analytics.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adj-date" className="text-xs font-medium">
                    Adjustment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="adj-date"
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    disabled={isSubmitting}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-desc" className="text-xs font-medium">
                    Description
                  </Label>
                  <Input
                    id="adj-desc"
                    placeholder={
                      isIncrease
                        ? "e.g. Monthly reconciliation"
                        : "e.g. Balance correction"
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adj-notes" className="text-xs font-medium">
                  Auditor Notes (Optional)
                </Label>
                <Input
                  id="adj-notes"
                  placeholder="Optional memo explaining why this adjustment occurred"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs"
                />
              </div>
            </TabsContent>

            {/* TAB 2: CORRECT OPENING BALANCE */}
            <TabsContent value="opening_balance" className="space-y-3.5 mt-0">
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Info className="h-4 w-4" />
                  <span>Fixing Starting Baseline</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Use this mode <strong>only</strong> if the starting balance was entered incorrectly when creating this account. It updates the initial baseline and recalculates current balance without creating extra transactions.
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Original Initial Balance:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(initialBal, account.currency)}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-initial-balance" className="text-xs font-medium">
                  Correct Initial Balance ({account.currency}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-initial-balance"
                  type="number"
                  step="0.01"
                  value={newInitialBalance}
                  onChange={(e) => setNewInitialBalance(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono text-sm"
                  required
                />
              </div>

              {hasInitialDiff && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shift in Initial Balance:</span>
                    <span className="font-mono font-bold text-foreground">
                      {initialDiff > 0 ? "+" : ""}
                      {formatCurrency(initialDiff, account.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">New Resulting Current Balance:</span>
                    <span className="font-mono font-bold text-primary">
                      {formatCurrency(currentBal + initialDiff, account.currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="initial-reason" className="text-xs font-medium">
                  Reason for Correction (Optional)
                </Label>
                <Input
                  id="initial-reason"
                  placeholder="e.g. Typo during onboarding setup"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  className="text-xs"
                />
              </div>
            </TabsContent>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting ||
                  (mode === "current_balance" && (!hasCurrentDiff || !isValidTarget)) ||
                  (mode === "opening_balance" && !isValidNewInitial)
                }
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {mode === "current_balance"
                    ? "Apply Ledger Adjustment"
                    : "Save Corrected Balance"}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
