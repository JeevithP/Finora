"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

import { BudgetWithCategory, deleteBudgetAction } from "@/actions/budgets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteBudgetDialogProps {
  budget: BudgetWithCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBudgetDialog({
  budget,
  open,
  onOpenChange,
}: DeleteBudgetDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteBudgetAction(budget.id);
        if (res.success) {
          toast.success(`Budget for "${budget.category?.name}" removed.`);
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to delete budget");
        }
      } catch {
        toast.error("An unexpected error occurred while deleting the budget.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <span>Delete Budget</span>
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Are you sure you want to remove the monthly budget for <strong className="text-foreground">{budget.category?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Deleting this budget will remove the category allowance for this month. Past recorded transactions will remain untouched in your financial ledger.
          </p>
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
            id="confirm-delete-budget-btn"
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Delete Budget</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
