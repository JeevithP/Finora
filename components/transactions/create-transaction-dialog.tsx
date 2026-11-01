"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
import { createClient } from "@/lib/supabase/client";
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

// User-scoped in-memory category cache: maps authenticated userId -> Category[]
const userCategoryCache = new Map<string, Category[]>();

// In-flight request deduplication map: maps authenticated userId -> Promise<Category[]>
const pendingCategoryRequests = new Map<string, Promise<Category[]>>();

// Active authenticated user tracking to ensure stale requests from previous users are discarded
let currentAuthUserId: string | null = null;

export function __resetCategoriesCacheForTesting() {
  userCategoryCache.clear();
  pendingCategoryRequests.clear();
  currentAuthUserId = null;
}

export function __getUserCategoryCacheForTesting() {
  return userCategoryCache;
}

export function __getPendingCategoryRequestsForTesting() {
  return pendingCategoryRequests;
}

export function __setCurrentAuthUserIdForTesting(userId: string | null) {
  currentAuthUserId = userId;
}

interface CreateTransactionDialogProps {
  accounts: Account[];
  categories?: Category[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultCurrency?: string;
  defaultAccountId?: string;
}

export function CreateTransactionDialog({
  accounts,
  categories: categoriesProp,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  defaultAccountId,
}: CreateTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);

  // State for lazy-loaded categories
  const [loadedCategories, setLoadedCategories] = useState<Category[] | null>(
    () => categoriesProp ?? null
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(currentAuthUserId);

  // Supabase Auth Lifecycle Subscription
  useEffect(() => {
    isMountedRef.current = true;
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;
      currentAuthUserId = newUserId;
      currentUserIdRef.current = newUserId;

      if (event === "SIGNED_OUT" || !newUserId) {
        // Immediate cache invalidation on logout
        userCategoryCache.clear();
        pendingCategoryRequests.clear();
        currentAuthUserId = null;
        if (isMountedRef.current) {
          setLoadedCategories(null);
          setCategoryError(null);
        }
      } else if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (isMountedRef.current) {
          const cached = userCategoryCache.get(newUserId) ?? null;
          setLoadedCategories(cached);
          setCategoryError(null);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Synchronize when categoriesProp changes
  useEffect(() => {
    if (categoriesProp) {
      setLoadedCategories(categoriesProp);
      setCategoryError(null);
    }
  }, [categoriesProp]);

  // Fallback to user-scoped cached or loaded categories
  const categories = useMemo(() => {
    if (categoriesProp) return categoriesProp;
    if (loadedCategories) return loadedCategories;
    if (currentUserIdRef.current && userCategoryCache.has(currentUserIdRef.current)) {
      return userCategoryCache.get(currentUserIdRef.current)!;
    }
    return [];
  }, [categoriesProp, loadedCategories]);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );
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

  // Function to load categories on demand (callable by useEffect on open or retry button)
  const loadCategories = useCallback(
    async (force = false) => {
      if (categoriesProp) return;
      if (!isMountedRef.current) return;

      setIsLoadingCategories(true);
      setCategoryError(null);

      try {
        const supabase = createClient();
        let userId = currentUserIdRef.current;
        if (!userId) {
          const { data: sessionData } = await supabase.auth.getSession();
          userId = sessionData?.session?.user?.id ?? null;
          if (!userId) {
            const { data: userData } = await supabase.auth.getUser();
            userId = userData?.user?.id ?? null;
          }
          if (userId) {
            currentAuthUserId = userId;
            currentUserIdRef.current = userId;
          }
        }

        if (!userId) {
          if (isMountedRef.current) {
            setCategoryError("Please sign in to view categories.");
            setIsLoadingCategories(false);
          }
          return;
        }

        // Cache hit check: reuse cached categories ONLY when the authenticated user ID matches
        if (!force && userCategoryCache.has(userId)) {
          const cached = userCategoryCache.get(userId)!;
          if (isMountedRef.current && currentUserIdRef.current === userId) {
            setLoadedCategories(cached);
            setIsLoadingCategories(false);
            setCategoryError(null);
          }
          return;
        }

        // In-flight request deduplication for the same authenticated user
        let requestPromise = pendingCategoryRequests.get(userId);
        if (!requestPromise || force) {
          let fetchPromise: Promise<Category[]> = null!;
          fetchPromise = (async () => {
            try {
              const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("name", { ascending: true });

              if (error) {
                throw new Error(error.message || "Failed to load categories");
              }
              return (data || []) as Category[];
            } finally {
              if (pendingCategoryRequests.get(userId) === fetchPromise) {
                pendingCategoryRequests.delete(userId);
              }
            }
          })();

          pendingCategoryRequests.set(userId, fetchPromise);
          requestPromise = fetchPromise;
        }

        const data = await requestPromise;

        // Stale request protection: verify that the user did not switch or log out during fetch
        if (currentAuthUserId !== userId) {
          // Discard result: request belongs to an older/different user session
          return;
        }

        // Cache under the verified authenticated userId
        userCategoryCache.set(userId, data);

        if (isMountedRef.current && currentUserIdRef.current === userId) {
          setLoadedCategories(data);
          setCategoryError(null);
        }
      } catch (err: unknown) {
        if (currentAuthUserId !== currentUserIdRef.current) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load categories";
        if (isMountedRef.current) {
          setCategoryError(msg);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingCategories(false);
        }
      }
    },
    [categoriesProp]
  );

  const handleRetryCategories = useCallback(() => {
    loadCategories(true);
  }, [loadCategories]);

  // Lazy-fetch categories only when dialog opens and categories are not yet loaded
  useEffect(() => {
    if (categoriesProp) return;
    if (!open) return;

    loadCategories();
  }, [open, categoriesProp, loadCategories]);

  // Re-sync default values when dialog opens, accounts change, or categories become available
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
        const currentValid = categories.some(
          (c) =>
            c.id === selectedCategoryId &&
            (selectedType === "refund" || c.type === selectedType)
        );
        if (!currentValid && catForType) {
          setValue("categoryId", catForType, { shouldValidate: true });
        }
      }
    }
  }, [open, selectedType, defaultAccountId, activeAccounts, categories, selectedCategoryId, setValue]);

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
    if (isSubmittingRef.current || isSubmitting) return;

    if (values.type !== "transfer" && categories.length === 0) {
      toast.error("Please wait for categories to finish loading.");
      return;
    }

    isSubmittingRef.current = true;

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
          setOpen(false);
          const firstExpCat =
            categories.find((c) => c.type === "expense")?.id || null;
          reset({
            type: "expense",
            amount: 0,
            date: todayStr,
            description: "",
            notes: "",
            accountId: defaultFirstAcc,
            destinationAccountId: null,
            categoryId: firstExpCat,
            originalTransactionId: null,
          });
        } else {
          toast.error(res.error || "Failed to record transaction");
        }
      } catch (err: unknown) {
        console.error("Transaction creation error:", err);
        toast.error("An unexpected error occurred while saving the transaction.");
      } finally {
        isSubmittingRef.current = false;
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
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          if (typeof document !== "undefined") {
            const active = document.activeElement;
            if (!active || active === document.body || !document.body.contains(active)) {
              const main = document.querySelector("main");
              if (main) {
                if (!main.hasAttribute("tabindex")) {
                  main.setAttribute("tabindex", "-1");
                }
                (main as HTMLElement).focus({ preventScroll: true });
                e.preventDefault();
              }
            }
          }
        }}
      >
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="tx-category" className="text-xs font-medium">
                    Category{" "}
                    {selectedType === "refund" ? (
                      <span className="text-muted-foreground">(Optional)</span>
                    ) : (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  {isLoadingCategories && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Loading...</span>
                    </span>
                  )}
                </div>

                {isLoadingCategories && categories.length === 0 ? (
                  <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading categories...</span>
                  </div>
                ) : categoryError && categories.length === 0 ? (
                  <div className="flex h-9 w-full items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                    <span className="truncate">{categoryError}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRetryCategories}
                      className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={
                      selectedCategoryId ||
                      (selectedType === "refund"
                        ? "none"
                        : availableCategories[0]?.id || "")
                    }
                    onValueChange={(val) =>
                      setValue("categoryId", val === "none" ? null : val, {
                        shouldValidate: true,
                      })
                    }
                    disabled={isSubmitting || availableCategories.length === 0}
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
                )}
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
              disabled={
                isSubmitting ||
                isSubmittingRef.current ||
                activeAccounts.length === 0 ||
                (selectedType !== "transfer" &&
                  (isLoadingCategories ||
                    (categories.length === 0 && Boolean(categoryError))))
              }
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
