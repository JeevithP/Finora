"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Landmark } from "lucide-react";

import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/lib/validations/account";
import { createAccountAction } from "@/actions/accounts";
import { ACCOUNT_TYPES, CURRENCIES } from "@/lib/constants";
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

interface CreateAccountDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultCurrency?: string;
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

export function CreateAccountDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  defaultCurrency = "INR",
}: CreateAccountDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      initialBalance: 0,
      currency: defaultCurrency,
      color: "#3b82f6",
      icon: "Landmark",
    },
  });

  const selectedType = watch("type");
  const selectedCurrency = watch("currency");
  const selectedColor = watch("color");

  const onSubmit = async (values: CreateAccountInput) => {
    setIsSubmitting(true);
    try {
      const res = await createAccountAction(values);
      if (res.success) {
        toast.success(`Account "${values.name}" created successfully!`);
        reset({
          name: "",
          type: "checking",
          initialBalance: 0,
          currency: defaultCurrency,
          color: "#3b82f6",
          icon: "Landmark",
        });
        router.refresh();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create account");
      }
    } catch {
      toast.error("An unexpected error occurred while creating the account.");
    } finally {
      setIsSubmitting(false);
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
            <span>Add Account</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <span>Create New Account</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add an asset or liability account to track balances in your ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="account-name" className="text-xs font-medium">
              Account Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-name"
              placeholder="e.g. HDFC Salary Account, SBI Savings"
              {...register("name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Account Type */}
          <div className="space-y-1.5">
            <Label htmlFor="account-type" className="text-xs font-medium">
              Account Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedType}
              onValueChange={(val: any) =>
                setValue("type", val, { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="account-type">
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

          {/* Initial Balance & Currency Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="initial-balance" className="text-xs font-medium">
                Initial Balance
              </Label>
              <Input
                id="initial-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("initialBalance", { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.initialBalance && (
                <p className="text-xs text-destructive">
                  {errors.initialBalance.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-currency" className="text-xs font-medium">
                Currency
              </Label>
              <Select
                value={selectedCurrency}
                onValueChange={(val) =>
                  setValue("currency", val, { shouldValidate: true })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="account-currency">
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
                <p className="text-xs text-destructive">
                  {errors.currency.message}
                </p>
              )}
            </div>
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Create Account</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
