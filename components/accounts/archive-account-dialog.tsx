"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, RotateCcw, Loader2 } from "lucide-react";

import { Account } from "@/types/database.types";
import { toggleArchiveAccountAction } from "@/actions/accounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ArchiveAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveAccountDialog({
  account,
  open,
  onOpenChange,
}: ArchiveAccountDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isArchived = account.is_archived;

  const handleToggle = async () => {
    setIsSubmitting(true);
    try {
      const res = await toggleArchiveAccountAction(account.id, !isArchived);
      if (res.success) {
        toast.success(
          isArchived
            ? `Account "${account.name}" restored to active accounts.`
            : `Account "${account.name}" has been archived.`
        );
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update account archive status");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isArchived
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {isArchived ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </div>
            <span>
              {isArchived ? "Restore Account" : "Archive Account"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            {isArchived
              ? `Restore "${account.name}" to your active accounts list so it appears in standard ledger reporting.`
              : `Archiving "${account.name}" hides it from active selectors while safely preserving all historical transactions and balance records.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isArchived ? "default" : "secondary"}
            onClick={handleToggle}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isArchived ? "Restore Account" : "Archive Account"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
