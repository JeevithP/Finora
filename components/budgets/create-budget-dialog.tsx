"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus, PiggyBank, Loader2 } from "lucide-react";

import { Category } from "@/types/database.types";
import { createBudgetAction } from "@/actions/budgets";
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

interface CreateBudgetDialogProps {
  categories: Category[];
  availableCategories: Category[];
  month: number;
  year: number;
  defaultCurrency: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CreateBudgetDialog({
  availableCategories,
  month,
  year,
  defaultCurrency,
}: CreateBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && availableCategories.length > 0 && !categoryId) {
      setCategoryId(availableCategories[0].id);
    }
  }, [open, availableCategories, categoryId]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCategoryId("");
      setFieldErrors({});
    }
  };

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

    if (!categoryId) {
      setFieldErrors({ categoryId: ["Please select an expense category"] });
      return;
    }

    startTransition(async () => {
      try {
        const res = await createBudgetAction({
          categoryId,
          amount: numericAmount,
          month,
          year,
        });

        if (res.success) {
          toast.success("Budget allowance created successfully.");
          handleOpenChange(false);
        } else {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          toast.error(res.error || "Failed to create budget");
        }
      } catch {
        toast.error("An unexpected error occurred while creating the budget.");
      }
    });
  };

  const monthLabel = MONTH_NAMES[month - 1];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>Add Budget</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="h-4 w-4" />
            </div>
            <span>New Budget Allowance</span>
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Allocate a monthly spending cap for <strong className="text-foreground">{monthLabel} {year}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-medium">
              Expense Category <span className="text-destructive">*</span>
            </Label>
            {availableCategories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
                All expense categories already have budgets allocated for this month.
              </div>
            ) : (
              <Select
                value={categoryId || undefined}
                onValueChange={setCategoryId}
              >
                <SelectTrigger id="category" className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select an expense category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: c.color || "#64748b" }}
                        />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {fieldErrors.categoryId && (
              <p className="text-[11px] text-destructive">
                {fieldErrors.categoryId[0]}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium">
              Monthly Budget Cap ({defaultCurrency}) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 15000"
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
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-create-budget-btn"
              type="submit"
              disabled={isPending || availableCategories.length === 0}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Budget</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
