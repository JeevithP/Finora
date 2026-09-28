"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";

import {
  createTransactionSchema,
  type CreateTransactionInput,
  type TransactionType,
} from "@/lib/validations/transaction";
import { createTransactionAction } from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateTransactionDialogProps {
  accounts: Account[];
  categories: Category[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultCurrency?: string;
  defaultAccountId?: string;
}

export function CreateTransactionDialog({
  accounts,
  categories,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  defaultAccountId,
}: CreateTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const todayStr = new Date().toISOString().split("T")[0];

  const defaultFirstAcc = defaultAccountId || activeAccounts[0]?.id || "";
  const defaultFirstExpCat =
    categories.find((c) => c.type === "expense")?.id || null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      date: todayStr,
      description: "",
      notes: "",
      accountId: defaultFirstAcc,
      destinationAccountId: null,
      categoryId: defaultFirstExpCat,
      originalTransactionId: null,
    },
  });

  const selectedType = (watch("type") as TransactionType) || "expense";
  const selectedAccountId = watch("accountId") || defaultFirstAcc;
  const selectedDestAccountId = watch("destinationAccountId");
  const selectedCategoryId = watch("categoryId");

  // Filter categories matching current transaction type
  const availableCategories = categories.filter((c) => {
    if (selectedType === "income") return c.type === "income";
    if (selectedType === "expense") return c.type === "expense";
    if (selectedType === "refund") return true;
    return false;
  });

  // Re-sync default values when dialog opens or accounts change
  useEffect(() => {
    if (open && activeAccounts.length > 0) {
      const firstAcc = defaultAccountId || activeAccounts[0]?.id || "";
      const catForType =
        categories.find((c) => c.type === selectedType)?.id ||
        (selectedType === "income"
          ? categories.find((c) => c.type === "income")?.id
          : categories.find((c) => c.type === "expense")?.id) ||
        null;

      setValue("accountId", firstAcc, { shouldValidate: true });
      if (selectedType === "transfer") {
        setValue("categoryId", null);
        const otherAccount = activeAccounts.find((a) => a.id !== firstAcc);
        setValue("destinationAccountId", otherAccount ? otherAccount.id : null, {
          shouldValidate: true,
        });
      } else {
        setValue("destinationAccountId", null);
        setValue("categoryId", catForType, { shouldValidate: true });
      }
    }
  }, [open, selectedType, defaultAccountId, accounts, categories, setValue]);

  // Handle Type Change
  const handleTypeChange = (newType: TransactionType) => {
    setValue("type", newType, { shouldValidate: true });
    const currentAcc = selectedAccountId || activeAccounts[0]?.id || "";
    setValue("accountId", currentAcc, { shouldValidate: true });

    if (newType === "transfer") {
      setValue("categoryId", null, { shouldValidate: true });
      const otherAccount = activeAccounts.find((a) => a.id !== currentAcc);
      setValue("destinationAccountId", otherAccount ? otherAccount.id : null, {
        shouldValidate: true,
      });
    } else if (newType === "income") {
      setValue("destinationAccountId", null, { shouldValidate: true });
      const incCat = categories.find((c) => c.type === "income");
      setValue("categoryId", incCat ? incCat.id : null, {
        shouldValidate: true,
      });
    } else if (newType === "expense") {
      setValue("destinationAccountId", null, { shouldValidate: true });
      const expCat = categories.find((c) => c.type === "expense");
      setValue("categoryId", expCat ? expCat.id : null, {
        shouldValidate: true,
      });
    } else if (newType === "refund") {
      setValue("destinationAccountId", null, { shouldValidate: true });
      setValue("categoryId", null, { shouldValidate: true });
    }
  };

  const onSubmit = (values: CreateTransactionInput) => {
    const finalValues: CreateTransactionInput = {
      ...values,
      accountId: values.accountId || activeAccounts[0]?.id || "",
      categoryId:
        values.type === "transfer"
          ? null
          : values.categoryId || availableCategories[0]?.id || null,
      destinationAccountId:
        values.type === "transfer"
          ? values.destinationAccountId ||
            activeAccounts.find((a) => a.id !== (values.accountId || activeAccounts[0]?.id))?.id ||
            null
          : null,
    };

    startTransition(async () => {
      try {
        const res = await createTransactionAction(finalValues);
        if (res.success) {
          toast.success("Transaction recorded successfully!");
          reset({
            type: "expense",
            amount: 0,
            date: todayStr,
            description: "",
            notes: "",
            accountId: defaultFirstAcc,
            destinationAccountId: null,
            categoryId: defaultFirstExpCat,
            originalTransactionId: null,
          });
          setOpen(false);
        } else {
          toast.error(res.error || "Failed to record transaction");
        }
      } catch {
        toast.error("An unexpected error occurred while saving the transaction.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      toast.error(formErrors[firstKey as keyof typeof formErrors]?.message || "Please check form inputs");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Record Transaction
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add a new income, expense, transfer, or refund entry to your ledger.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Type Tabs */}
        <div className="pt-1">
          <Tabs
            value={selectedType}
            onValueChange={(val) => handleTypeChange(val as TransactionType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="expense" className="gap-1.5 text-xs">
                <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
                <span>Expense</span>
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-1.5 text-xs">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                <span>Income</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-1.5 text-xs">
                <ArrowLeftRight className="h-3.5 w-3.5 text-sky-500" />
                <span>Transfer</span>
              </TabsTrigger>
              <TabsTrigger value="refund" className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                <span>Refund</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 py-2">
          {/* Amount and Date Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount" className="text-xs font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="font-mono text-base font-semibold pl-3"
                  {...register("amount", { valueAsNumber: true })}
                  disabled={isSubmitting}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-date" className="text-xs font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tx-date"
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
            <Label htmlFor="tx-description" className="text-xs font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tx-description"
              placeholder={
                selectedType === "transfer"
                  ? "e.g. ATM withdrawal, Credit card bill payment"
                  : selectedType === "income"
                  ? "e.g. Monthly salary, Freelance payment"
                  : "e.g. Grocery shopping, Electricity bill"
              }
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
                  value={selectedAccountId || activeAccounts[0]?.id || ""}
                  onValueChange={(val) => {
                    setValue("accountId", val, { shouldValidate: true });
                    if (selectedDestAccountId === val) {
                      const other = activeAccounts.find((a) => a.id !== val);
                      setValue("destinationAccountId", other ? other.id : null, {
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="tx-source-account">
                    <SelectValue placeholder="Select Source Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
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
                  <SelectTrigger id="tx-dest-account">
                    <SelectValue placeholder="Select Target Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((acc) => acc.id !== (selectedAccountId || activeAccounts[0]?.id))
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
                  value={selectedAccountId || activeAccounts[0]?.id || ""}
                  onValueChange={(val) =>
                    setValue("accountId", val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="tx-account">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
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
                  value={selectedCategoryId || availableCategories[0]?.id || "none"}
                  onValueChange={(val) =>
                    setValue("categoryId", val === "none" ? null : val, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="tx-category">
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
            <Label htmlFor="tx-notes" className="text-xs font-medium text-muted-foreground">
              Notes (Optional)
            </Label>
            <Input
              id="tx-notes"
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || activeAccounts.length === 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Transaction</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
