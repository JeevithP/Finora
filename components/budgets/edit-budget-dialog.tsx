"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { Edit3, Loader2 } from "lucide-react";

import { BudgetWithCategory, updateBudgetAction } from "@/actions/budgets";
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

interface EditBudgetDialogProps {
  budget: BudgetWithCategory;
  defaultCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBudgetDialog({
  budget,
  defaultCurrency,
  open,
  onOpenChange,
}: EditBudgetDialogProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const amountVal = formData.get("amount") as string;
    const numericAmount = parseFloat(amountVal);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFieldErrors({ amount: ["Budget amount must be greater than 0"] });
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateBudgetAction({
          id: budget.id,
          amount: numericAmount,
        });

        if (res.success) {
          toast.success(`Budget for "${budget.category?.name}" updated.`);
          onOpenChange(false);
        } else {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          toast.error(res.error || "Failed to update budget");
        }
      } catch {
        toast.error("An unexpected error occurred while updating the budget.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Edit3 className="h-4 w-4" />
            </div>
            <span>Edit Budget Allowance</span>
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Adjust monthly allowance for <strong className="text-foreground">{budget.category?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category (Read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Category
            </Label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: budget.category?.color || "#3b82f6" }}
              />
              <span>{budget.category?.name}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount" className="text-xs font-medium">
              Monthly Budget Cap ({defaultCurrency}) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={budget.amount}
              className="h-9 text-xs font-mono bg-background"
            />
            {fieldErrors.amount && (
              <p className="text-[11px] text-destructive">
                {fieldErrors.amount[0]}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-update-budget-btn"
              type="submit"
              disabled={isPending}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Update Budget</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
