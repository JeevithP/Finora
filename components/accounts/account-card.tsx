"use client";

import React, { useState } from "react";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Wallet,
  Receipt,
  MoreVertical,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Account } from "@/types/database.types";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditAccountDialog } from "./edit-account-dialog";
import { ArchiveAccountDialog } from "./archive-account-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

interface AccountCardProps {
  account: Account;
  transactionCount?: number;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; isLiability: boolean }
> = {
  checking: { label: "Checking", icon: Landmark, isLiability: false },
  savings: { label: "Savings", icon: PiggyBank, isLiability: false },
  cash: { label: "Cash / Wallet", icon: Wallet, isLiability: false },
  investment: { label: "Investment", icon: TrendingUp, isLiability: false },
  credit_card: { label: "Credit Card", icon: CreditCard, isLiability: true },
  loan: { label: "Loan", icon: Receipt, isLiability: true },
};

export function AccountCard({ account, transactionCount = 0 }: AccountCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const hasTransactions = transactionCount > 0;

  const config = TYPE_CONFIG[account.type] || {
    label: account.type,
    icon: Landmark,
    isLiability: false,
  };
  const IconComponent = config.icon;
  const color = account.color || "#3b82f6";
  const balance = Number(account.current_balance);

  return (
    <>
      <Card
        className={`group relative overflow-hidden border-border/80 bg-card shadow-xs transition-all hover:shadow-sm ${
          account.is_archived ? "opacity-75 bg-muted/20" : ""
        }`}
      >
        {/* Left Color Accent Strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: color }}
        />

        <CardContent className="p-5 pl-6">
          <div className="flex items-start justify-between gap-2">
            {/* Account Icon & Name */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: `${color}15`,
                  color: color,
                }}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground leading-snug line-clamp-1">
                    {account.name}
                  </h3>
                  {account.is_archived && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0"
                    >
                      Archived
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {config.label}
                </span>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Account actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setEditOpen(true)}
                  className="gap-2 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Details</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setArchiveOpen(true)}
                  className="gap-2 text-xs"
                >
                  {account.is_archived ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Balance Presentation */}
          <div className="mt-4 pt-3 border-t border-border/40 flex items-baseline justify-between">
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {formatCurrency(balance, account.currency)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Initial: {formatCurrency(account.initial_balance, account.currency)}
              </span>
            </div>

            <Badge
              variant="secondary"
              className="text-[10px] font-mono uppercase px-1.5 py-0.5"
            >
              {account.currency}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <EditAccountDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
        hasTransactions={hasTransactions}
      />

      <ArchiveAccountDialog
        account={account}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />

      <DeleteAccountDialog
        account={account}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
