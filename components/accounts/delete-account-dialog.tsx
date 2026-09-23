"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

import { Account } from "@/types/database.types";
import { deleteAccountAction } from "@/actions/accounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await deleteAccountAction(account.id);
      if (res.success) {
        toast.success(`Account "${account.name}" permanently deleted.`);
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to delete account");
      }
    } catch {
      toast.error("An unexpected error occurred while deleting the account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <span>Delete Account</span>
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Are you sure you want to delete <strong className="text-foreground">"{account.name}"</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Accounts with recorded financial ledger transactions cannot be deleted to preserve accounting integrity. If this account has past transactions, please archive it instead.
          </p>
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Permanently Delete</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
