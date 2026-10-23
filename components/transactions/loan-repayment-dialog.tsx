"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Receipt,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { createLoanRepaymentAction } from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface LoanRepaymentDialogProps {
  accounts: Account[];
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLoanId?: string;
}

export function LoanRepaymentDialog({
  accounts,
  categories,
  open,
  onOpenChange,
  preselectedLoanId,
}: LoanRepaymentDialogProps) {
  const [isSubmitting, startTransition] = useTransition();

  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const assetTypes = ["checking", "savings", "cash", "investment"];
  const assetAccounts = activeAccounts.filter((a) =>
    assetTypes.includes(a.type)
  );
  const loanAccounts = activeAccounts.filter(
    (a) => a.type === "loan" || a.type === "credit_card"
  );
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const todayStr = new Date().toISOString().split("T")[0];

  const [payingAccountId, setPayingAccountId] = useState<string>("");
  const [loanAccountId, setLoanAccountId] = useState<string>("");
  const [principalAmount, setPrincipalAmount] = useState<string>("");
  const [includeInterest, setIncludeInterest] = useState<boolean>(false);
  const [interestAmount, setInterestAmount] = useState<string>("");
  const [interestCategoryId, setInterestCategoryId] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(todayStr);
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      const defaultPaying = assetAccounts[0]?.id || "";
      const defaultLoan =
        preselectedLoanId && loanAccounts.some((a) => a.id === preselectedLoanId)
          ? preselectedLoanId
          : loanAccounts[0]?.id || "";

      setPayingAccountId(defaultPaying);
      setLoanAccountId(defaultLoan);
      setPrincipalAmount("");
      setIncludeInterest(false);
      setInterestAmount("");
      setInterestCategoryId(expenseCategories[0]?.id || "");
      setTxDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setNotes("");
    }
  }, [open, preselectedLoanId]);

  const selectedPaying = assetAccounts.find((a) => a.id === payingAccountId);
  const selectedLoan = loanAccounts.find((a) => a.id === loanAccountId);

  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedInterest = includeInterest ? parseFloat(interestAmount) || 0 : 0;
  const totalDeduction = parsedPrincipal + parsedInterest;
  const currency = selectedPaying?.currency || selectedLoan?.currency || "INR";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!payingAccountId) {
      toast.error("Please select a paying asset account");
      return;
    }
    if (!loanAccountId) {
      toast.error("Please select a loan liability account");
      return;
    }
    if (payingAccountId === loanAccountId) {
      toast.error("Paying account and loan account cannot be the same");
      return;
    }
    if (parsedPrincipal <= 0) {
      toast.error("Principal repayment amount must be greater than zero");
      return;
    }
    if (includeInterest && parsedInterest <= 0) {
      toast.error("Interest amount must be greater than zero when interest is enabled");
      return;
    }
    if (includeInterest && !interestCategoryId) {
      toast.error("Please select an expense category for the interest portion");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createLoanRepaymentAction({
          payingAccountId,
          loanAccountId,
          principalAmount: parsedPrincipal,
          interestAmount: includeInterest ? parsedInterest : 0,
          interestCategoryId: includeInterest ? interestCategoryId : null,
          date: txDate || todayStr,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          toast.success(
            `Recorded loan repayment of ${formatCurrency(
              parsedPrincipal,
              currency
            )}${
              includeInterest
                ? ` + ${formatCurrency(parsedInterest, currency)} interest`
                : ""
            } successfully!`
          );
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to record loan repayment");
        }
      } catch {
        toast.error("An unexpected error occurred while processing repayment");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <span>Record Loan Repayment</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Repay principal debt from your asset account. Excluded from ordinary expense totals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Account Selection Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Paying Asset Account */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Paying Account <span className="text-destructive">*</span>
              </Label>
              <Select
                value={payingAccountId}
                onValueChange={setPayingAccountId}
                disabled={isSubmitting}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Source bank/cash" />
                </SelectTrigger>
                <SelectContent>
                  {assetAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} ({formatCurrency(Number(a.current_balance), a.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Loan Account */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Loan Account <span className="text-destructive">*</span>
              </Label>
              <Select
                value={loanAccountId}
                onValueChange={setLoanAccountId}
                disabled={isSubmitting}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Target loan debt" />
                </SelectTrigger>
                <SelectContent>
                  {loanAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} (Debt: {formatCurrency(Number(a.current_balance), a.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Principal Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="principal-amount" className="text-xs font-medium">
              Principal Repayment Amount ({currency}) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="principal-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              disabled={isSubmitting}
              className="font-mono text-sm"
              required
            />
          </div>

          {/* Optional Interest Section */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-interest"
                checked={includeInterest}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setIncludeInterest(Boolean(checked))
                }
                disabled={isSubmitting}
              />
              <Label
                htmlFor="include-interest"
                className="text-xs font-medium cursor-pointer"
              >
                Include Interest or Financing Fee (Recorded as Expense)
              </Label>
            </div>

            {includeInterest && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label htmlFor="interest-amount" className="text-xs font-medium">
                    Interest Amount ({currency}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="interest-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(e.target.value)}
                    disabled={isSubmitting}
                    className="font-mono text-xs"
                    required={includeInterest}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Expense Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={interestCategoryId}
                    onValueChange={setInterestCategoryId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Interest category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Date & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-date" className="text-xs font-medium">
                Payment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan-date"
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                disabled={isSubmitting}
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-desc" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="loan-desc"
                placeholder={
                  selectedLoan
                    ? `Loan Repayment: ${selectedLoan.name}`
                    : "e.g. Monthly EMI"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="text-xs"
              />
            </div>
          </div>

          {/* Accounting Ledger Summary Box */}
          {parsedPrincipal > 0 && (
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-primary font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Accounting & Ledger Summary</span>
              </div>
              <div className="space-y-1 text-muted-foreground pt-1">
                <div className="flex justify-between">
                  <span>Deducted from {selectedPaying?.name || "Bank"}:</span>
                  <span className="font-mono font-semibold text-foreground">
                    -{formatCurrency(totalDeduction, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Debt Reduced on {selectedLoan?.name || "Loan"}:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    -{formatCurrency(parsedPrincipal, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Counted as Expense in Analytics:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {includeInterest && parsedInterest > 0
                      ? formatCurrency(parsedInterest, currency)
                      : "₹0.00 (Principal excluded)"}
                  </span>
                </div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || parsedPrincipal <= 0}
              className="gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirm Repayment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
