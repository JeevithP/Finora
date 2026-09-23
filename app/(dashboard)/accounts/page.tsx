import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Account, Profile } from "@/types/database.types";
import { AccountSummaryCards } from "@/components/accounts/account-summary-cards";
import { AccountGrid } from "@/components/accounts/account-grid";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile for default currency
  const { data: profileData } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Pick<Profile, "default_currency"> | null;
  const defaultCurrency = profile?.default_currency || "INR";

  // Fetch all accounts owned by user
  const { data: accountsData, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load accounts:", error);
  }

  const accounts = (accountsData as Account[]) || [];

  // Fetch transactions for user's accounts to determine transaction presence
  const { data: userTransactions } = await supabase
    .from("transactions")
    .select("account_id, destination_account_id")
    .eq("user_id", user.id);

  const transactionCounts: Record<string, number> = {};
  (userTransactions || []).forEach((tx) => {
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
