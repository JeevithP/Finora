import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { Account, Category } from "@/types/database.types";
import { AccountSummaryCards } from "@/components/accounts/account-summary-cards";
import { AccountGrid } from "@/components/accounts/account-grid";

export default async function AccountsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize user profile, accounts, and categories
  const [profile, accountsResult, categoriesResult] = await Promise.all([
    getUserProfile(user.id),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order("name", { ascending: true }),
  ]);

  const defaultCurrency = profile?.default_currency || "INR";

  if (accountsResult.error) {
    console.error("Failed to load accounts:", accountsResult.error);
  }

  const accounts = (accountsResult.data || []) as Account[];
  const categories = (categoriesResult.data || []) as Category[];

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
        categories={categories}
      />
    </div>
  );
}
