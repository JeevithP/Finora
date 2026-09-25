"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Edit3, Lock } from "lucide-react";

import {
  updateAccountSchema,
  type UpdateAccountInput,
} from "@/lib/validations/account";
import { updateAccountAction } from "@/actions/accounts";
import { ACCOUNT_TYPES, CURRENCIES } from "@/lib/constants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTransactions?: boolean;
}

const COLOR_PRESETS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#ef4444" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Slate", value: "#64748b" },
];

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
  hasTransactions = false,
}: EditAccountDialogProps) {
  const [isSubmitting, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateAccountInput>({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      color: account.color || "#3b82f6",
      icon: account.icon || "Landmark",
    },
  });

  useEffect(() => {
    reset({
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      color: account.color || "#3b82f6",
      icon: account.icon || "Landmark",
    });
  }, [account, reset]);

  const selectedType = watch("type");
  const selectedCurrency = watch("currency");
  const selectedColor = watch("color");

  const onSubmit = (values: UpdateAccountInput) => {
    startTransition(async () => {
      try {
        const res = await updateAccountAction(values);
        if (res.success) {
          toast.success(`Account "${values.name}" updated successfully!`);
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to update account");
        }
      } catch {
        toast.error("An unexpected error occurred while updating the account.");
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
            <span>Edit Account Details</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update account name, type, and presentation styling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Read-Only Balance Info Cards */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            <div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Initial Balance
              </span>
              <p className="mt-1 font-semibold text-foreground">
                {formatCurrency(account.initial_balance, account.currency)}
              </p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Current Balance
              </span>
              <p className="mt-1 font-semibold text-foreground">
                {formatCurrency(account.current_balance, account.currency)}
              </p>
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-account-name" className="text-xs font-medium">
              Account Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-account-name"
              {...register("name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Account Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-account-type" className="text-xs font-medium">
                Account Type <span className="text-destructive">*</span>
              </Label>
              {hasTransactions && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> Locked (history exists)
                </span>
              )}
            </div>
            <Select
              value={selectedType}
              onValueChange={(val: any) =>
                setValue("type", val, { shouldValidate: true })
              }
              disabled={isSubmitting || hasTransactions}
            >
              <SelectTrigger id="edit-account-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-account-currency" className="text-xs font-medium">
                Currency
              </Label>
              {hasTransactions && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> Locked (history exists)
                </span>
              )}
            </div>
            <Select
              value={selectedCurrency}
              onValueChange={(val) =>
                setValue("currency", val, { shouldValidate: true })
              }
              disabled={isSubmitting || hasTransactions}
            >
              <SelectTrigger id="edit-account-currency">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-xs text-destructive">{errors.currency.message}</p>
            )}
          </div>

          {/* Color Accent Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Card Color Theme</Label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {COLOR_PRESETS.map((p) => {
                const isSelected = selectedColor === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      setValue("color", p.value, { shouldValidate: true })
                    }
                    className={`h-7 w-7 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      isSelected
                        ? "scale-115 ring-2 ring-foreground"
                        : "hover:scale-105 opacity-80"
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={p.label}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
