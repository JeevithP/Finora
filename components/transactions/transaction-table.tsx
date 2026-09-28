"use client";

import React, { useState, useMemo } from "react";
import {
  MoreVertical,
  Edit3,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";

import { TransactionWithRelations } from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { TransactionFilterBar } from "./transaction-filter-bar";
import { TransactionEmptyState } from "./transaction-empty-state";

const CreateTransactionDialog = dynamic(
  () =>
    import("./create-transaction-dialog").then(
      (mod) => mod.CreateTransactionDialog
    ),
  { ssr: false }
);

const EditTransactionDialog = dynamic(
  () =>
    import("./edit-transaction-dialog").then(
      (mod) => mod.EditTransactionDialog
    ),
  { ssr: false }
);

const DeleteTransactionDialog = dynamic(
  () =>
    import("./delete-transaction-dialog").then(
      (mod) => mod.DeleteTransactionDialog
    ),
  { ssr: false }
);

interface TransactionTableProps {
  initialTransactions: TransactionWithRelations[];
  accounts: Account[];
  categories: Category[];
  defaultCurrency?: string;
}

export function TransactionTable({
  initialTransactions,
  accounts,
  categories,
  defaultCurrency = "INR",
}: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithRelations | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<TransactionWithRelations | null>(null);

  // Client-side filtering logic
  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter((tx) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || "").toLowerCase().includes(q);
        const notesMatch = (tx.notes || "").toLowerCase().includes(q);
        const accMatch = (tx.account?.name || "").toLowerCase().includes(q);
        const destMatch = (tx.destination_account?.name || "").toLowerCase().includes(q);
        const catMatch = (tx.category?.name || "").toLowerCase().includes(q);
        if (!descMatch && !notesMatch && !accMatch && !destMatch && !catMatch) {
          return false;
        }
      }

      // 2. Account Filter (Source or Destination)
      if (selectedAccount !== "all") {
        if (
          tx.account_id !== selectedAccount &&
          tx.destination_account_id !== selectedAccount
        ) {
          return false;
        }
      }

      // 3. Type Filter
      if (selectedType !== "all") {
        if (tx.type !== selectedType) {
          return false;
        }
      }

      // 4. Category Filter
      if (selectedCategory !== "all") {
        if (tx.category_id !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialTransactions,
    searchQuery,
    selectedAccount,
    selectedType,
    selectedCategory,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedAccount("all");
    setSelectedType("all");
    setSelectedCategory("all");
  };

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedAccount !== "all" ||
    selectedType !== "all" ||
    selectedCategory !== "all";

  // Helper for type badges
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium"
          >
            <ArrowUpRight className="h-3 w-3" />
            <span>Income</span>
          </Badge>
        );
      case "expense":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-medium"
          >
            <ArrowDownLeft className="h-3 w-3" />
            <span>Expense</span>
          </Badge>
        );
      case "transfer":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[11px] font-medium"
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span>Transfer</span>
          </Badge>
        );
      case "refund":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-medium"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Refund</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Helper for signed amount display
  const renderAmount = (tx: TransactionWithRelations) => {
    const currency = tx.account?.currency || defaultCurrency;
    const formatted = formatCurrency(tx.amount, currency);

    if (tx.type === "income" || tx.type === "refund") {
      return (
        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatted}
        </span>
      );
    }
    if (tx.type === "expense") {
      return (
        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
          -{formatted}
        </span>
      );
    }
    // Transfer
    return (
      <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
        {formatted}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authoritative ledger history across all your asset and liability accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {initialTransactions.length === 0 ? (
        <TransactionEmptyState
          onAddTransaction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <TransactionFilterBar
            accounts={accounts}
            categories={categories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onResetFilters={resetFilters}
          />

          {filteredTransactions.length === 0 ? (
            <TransactionEmptyState
              isFiltered={isFiltered}
              onResetFilters={resetFilters}
              onAddTransaction={() => setCreateOpen(true)}
            />
          ) : (
            <>
              {/* Desktop Table View (md and up) */}
              <div className="hidden md:block rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[200px]">Account / Route</TableHead>
                      <TableHead className="w-[150px]">Category</TableHead>
                      <TableHead className="w-[110px]">Type</TableHead>
                      <TableHead className="w-[130px] text-right">Amount</TableHead>
                      <TableHead className="w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="group">
                        {/* Date */}
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.date, "dd MMM yyyy")}
                        </TableCell>

                        {/* Description */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm">
                              {tx.description || "Untitled Transaction"}
                            </span>
                            {tx.notes && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {tx.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Account / Route */}
                        <TableCell>
                          {tx.type === "transfer" ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: tx.account?.color || "#3b82f6",
                                }}
                              />
                              <span className="truncate">{tx.account?.name}</span>
                              <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    tx.destination_account?.color || "#3b82f6",
                                }}
                              />
                              <span className="truncate">
                                {tx.destination_account?.name}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: tx.account?.color || "#3b82f6",
                                }}
                              />
                              <span className="font-medium truncate">
                                {tx.account?.name || "—"}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          {tx.category ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: tx.category.color || "#64748b",
                                }}
                              />
                              <span className="truncate">{tx.category.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              {tx.type === "transfer" ? "Transfer" : "—"}
                            </span>
                          )}
                        </TableCell>

                        {/* Type */}
                        <TableCell>{renderTypeBadge(tx.type)}</TableCell>

                        {/* Amount */}
                        <TableCell className="text-right whitespace-nowrap">
                          {renderAmount(tx)}
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() => setEditingTransaction(tx)}
                                className="gap-2 cursor-pointer text-xs"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingTransaction(tx)}
                                className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card / List View (< md) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredTransactions.map((tx) => (
                  <Card
                    key={tx.id}
                    className="border-border/80 bg-card shadow-2xs overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Top Bar: Date, Badge, Amount */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDate(tx.date, "dd MMM yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                          {renderTypeBadge(tx.type)}
                          <div className="text-sm">{renderAmount(tx)}</div>
                        </div>
                      </div>

                      {/* Middle: Description & Notes */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {tx.description || "Untitled Transaction"}
                          </p>
                          {tx.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => setEditingTransaction(tx)}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingTransaction(tx)}
                              className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Bottom: Account & Category Tags */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                        {/* Account Flow */}
                        {tx.type === "transfer" ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {tx.account?.name}
                            </span>
                            <ArrowLeftRight className="h-3 w-3" />
                            <span className="font-medium text-foreground">
                              {tx.destination_account?.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: tx.account?.color || "#3b82f6",
                              }}
                            />
                            <span className="font-medium text-foreground">
                              {tx.account?.name}
                            </span>
                          </div>
                        )}

                        {/* Category Tag */}
                        {tx.category && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: tx.category.color || "#64748b",
                              }}
                            />
                            <span>{tx.category.name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Single Create Transaction Dialog */}
      <CreateTransactionDialog
        accounts={accounts}
        categories={categories}
        defaultCurrency={defaultCurrency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          open={Boolean(editingTransaction)}
          onOpenChange={(open) => {
            if (!open) setEditingTransaction(null);
          }}
        />
      )}

      {/* Delete Transaction Confirmation Dialog */}
      {deletingTransaction && (
        <DeleteTransactionDialog
          transaction={deletingTransaction}
          open={Boolean(deletingTransaction)}
          onOpenChange={(open) => {
            if (!open) setDeletingTransaction(null);
          }}
        />
      )}
    </div>
  );
}
