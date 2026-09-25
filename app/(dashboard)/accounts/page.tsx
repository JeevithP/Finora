import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { Account } from "@/types/database.types";
import { AccountSummaryCards } from "@/components/accounts/account-summary-cards";
import { AccountGrid } from "@/components/accounts/account-grid";

export default async function AccountsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const defaultCurrency = profile?.default_currency || "INR";

  const supabase = await createClient();

  // Fetch accounts and transaction presence in parallel
  const [accountsResult, transactionsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("account_id, destination_account_id")
      .eq("user_id", user.id),
  ]);

  if (accountsResult.error) {
    console.error("Failed to load accounts:", accountsResult.error);
  }

  const accounts = (accountsResult.data as Account[]) || [];

  const transactionCounts: Record<string, number> = {};
  (transactionsResult.data || []).forEach((tx) => {
    if (tx.account_id) {
      transactionCounts[tx.account_id] = (transactionCounts[tx.account_id] || 0) + 1;
    }
    if (tx.destination_account_id) {
      transactionCounts[tx.destination_account_id] =
        (transactionCounts[tx.destination_account_id] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Accounts
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your asset accounts, credit cards, and tracked balances.
          </p>
        </div>
      </div>

      {/* Aggregate Financial Metrics */}
      <AccountSummaryCards
        accounts={accounts}
        defaultCurrency={defaultCurrency}
      />

      {/* Account Grid / Views */}
      <AccountGrid
        accounts={accounts}
        defaultCurrency={defaultCurrency}
        transactionCounts={transactionCounts}
      />
    </div>
  );
}
