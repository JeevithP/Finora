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

  const supabase = await createClient();

  // Parallelize user profile and accounts with embedded transaction existence check
  const [profile, accountsResult] = await Promise.all([
    getUserProfile(user.id),
    supabase
      .from("accounts")
      .select(
        "*, tx_src:transactions!transactions_account_id_fkey(id), tx_dst:transactions!transactions_destination_account_id_fkey(id)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1, { foreignTable: "tx_src" })
      .limit(1, { foreignTable: "tx_dst" }),
  ]);

  const defaultCurrency = profile?.default_currency || "INR";

  if (accountsResult.error) {
    console.error("Failed to load accounts:", accountsResult.error);
  }

  type RawAccountWithTx = Account & {
    tx_src?: { id: string }[];
    tx_dst?: { id: string }[];
  };

  const rawAccounts = (accountsResult.data ||
    []) as unknown as RawAccountWithTx[];

  const transactionCounts: Record<string, number> = {};
  const accounts: Account[] = rawAccounts.map((rawAcc) => {
    const { tx_src, tx_dst, ...account } = rawAcc;
    const srcCount = tx_src?.length || 0;
    const dstCount = tx_dst?.length || 0;
    if (srcCount > 0 || dstCount > 0) {
      transactionCounts[account.id] = srcCount + dstCount;
    }
    return account as Account;
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
