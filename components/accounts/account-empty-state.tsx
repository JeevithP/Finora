import React from "react";
import { Landmark, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateAccountDialog } from "./create-account-dialog";

interface AccountEmptyStateProps {
  defaultCurrency?: string;
}

export function AccountEmptyState({
  defaultCurrency = "INR",
}: AccountEmptyStateProps) {
  return (
    <Card className="border-dashed border-2 border-border/80 bg-card/50 shadow-none">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Landmark className="h-7 w-7" />
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          No Accounts Created Yet
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Get started by adding your bank accounts, credit cards, or cash wallets to begin tracking your financial net worth.
        </p>

        <div className="mt-6">
          <CreateAccountDialog
            defaultCurrency={defaultCurrency}
            trigger={
              <Button className="gap-2 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>Add Your First Account</span>
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
