"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  updateTransactionSchema,
  type UpdateTransactionInput,
  type TransactionType,
} from "@/lib/validations/transaction";
import {
  updateTransactionAction,
  type TransactionWithRelations,
} from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
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
import { Badge } from "@/components/ui/badge";

interface EditTransactionDialogProps {
  transaction: TransactionWithRelations;
  accounts: Account[];
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [isSubmitting, startTransition] = useTransition();

  const formattedDate = transaction.date
    ? transaction.date.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateTransactionInput>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      date: formattedDate,
      description: transaction.description || "",
      notes: transaction.notes || "",
      accountId: transaction.account_id,
      destinationAccountId: transaction.destination_account_id || null,
      categoryId: transaction.category_id || null,
      originalTransactionId: transaction.original_transaction_id || null,
    },
  });

  const selectedType = watch("type") as TransactionType;
  const selectedAccountId = watch("accountId");
  const selectedDestAccountId = watch("destinationAccountId");
  const selectedCategoryId = watch("categoryId");

  // Filter categories matching current transaction type
  const availableCategories = categories.filter((c) => {
    if (selectedType === "income") return c.type === "income";
    if (selectedType === "expense") return c.type === "expense";
    if (selectedType === "refund") return true;
    return false;
  });

  const onSubmit = (values: UpdateTransactionInput) => {
    startTransition(async () => {
      try {
        const res = await updateTransactionAction(values);
        if (res.success) {
          toast.success("Transaction updated successfully!");
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to update transaction");
        }
      } catch {
        toast.error("An unexpected error occurred while updating the transaction.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg font-semibold">
              Edit Transaction
            </DialogTitle>
            <Badge variant="secondary" className="capitalize font-mono text-xs">
              {transaction.type}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Modify ledger entry details. Account balance adjustments will be reconciled automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Amount and Date Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-tx-amount" className="text-xs font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="font-mono text-base font-semibold"
                {...register("amount", { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-tx-date" className="text-xs font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-tx-date"
                type="date"
                className="font-mono text-sm"
                {...register("date")}
                disabled={isSubmitting}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-tx-description" className="text-xs font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-tx-description"
              placeholder="e.g. Grocery shopping"
              {...register("description")}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Account Selection */}
          {selectedType === "transfer" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Source Account (From) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  From Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedAccountId || ""}
                  onValueChange={(val) =>
                    setValue("accountId", val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Source Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: acc.color || "#3b82f6" }}
                          />
                          <span>{acc.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            ({acc.currency})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accountId && (
                  <p className="text-xs text-destructive">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* Destination Account (To) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  To Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedDestAccountId || ""}
                  onValueChange={(val) =>
                    setValue("destinationAccountId", val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Target Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((acc) => acc.id !== selectedAccountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: acc.color || "#3b82f6" }}
                            />
                            <span>{acc.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono">
                              ({acc.currency})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.destinationAccountId && (
                  <p className="text-xs text-destructive">
                    {errors.destinationAccountId.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Single Account Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedAccountId || ""}
                  onValueChange={(val) =>
                    setValue("accountId", val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: acc.color || "#3b82f6" }}
                          />
                          <span>{acc.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            ({acc.currency})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accountId && (
                  <p className="text-xs text-destructive">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Category{" "}
                  {selectedType === "refund" ? (
                    <span className="text-muted-foreground">(Optional)</span>
                  ) : (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <Select
                  value={selectedCategoryId || "none"}
                  onValueChange={(val) =>
                    setValue("categoryId", val === "none" ? null : val, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedType === "refund" && (
                      <SelectItem value="none">
                        <span className="text-muted-foreground">None</span>
                      </SelectItem>
                    )}
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color || "#64748b" }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-xs text-destructive">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-tx-notes" className="text-xs font-medium text-muted-foreground">
              Notes (Optional)
            </Label>
            <Input
              id="edit-tx-notes"
              placeholder="Add optional notes or tags..."
              {...register("notes")}
              disabled={isSubmitting}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Update Transaction</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
