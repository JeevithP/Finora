"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import {
  deleteTransactionAction,
  type TransactionWithRelations,
} from "@/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteTransactionDialogProps {
  transaction: TransactionWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: DeleteTransactionDialogProps) {
  const [isDeleting, startTransition] = useTransition();

  const currency = transaction.account?.currency || "INR";
  const amountFormatted = formatCurrency(transaction.amount, currency);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteTransactionAction(transaction.id);
        if (res.success) {
          toast.success("Transaction deleted successfully");
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to delete transaction");
        }
      } catch {
        toast.error("An unexpected error occurred while deleting the transaction.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Delete Transaction?
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                This will permanently remove this ledger entry and update the account balance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Transaction Summary Card */}
        <div className="my-2 rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-sm text-foreground">
                {transaction.description || "Untitled Transaction"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(transaction.date)}
              </p>
            </div>
            <p className="font-mono font-bold text-sm text-foreground">
              {amountFormatted}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span>Type: <strong className="capitalize text-foreground font-medium">{transaction.type}</strong></span>
            <span>
              {transaction.type === "transfer"
                ? `${transaction.account?.name || "Source"} → ${transaction.destination_account?.name || "Destination"}`
                : `${transaction.account?.name || "Account"}`}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
