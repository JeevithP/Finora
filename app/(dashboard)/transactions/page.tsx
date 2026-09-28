import React from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { createClient } from "@/lib/supabase/server";
import { getTransactionsAction } from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
import { TransactionTable } from "@/components/transactions/transaction-table";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize independent data fetches: user profile, transactions list, accounts, categories
  const [profile, txResult, accountsResult, categoriesResult] =
    await Promise.all([
      getUserProfile(user.id),
      getTransactionsAction(),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order("name", { ascending: true }),
    ]);

  const defaultCurrency = profile?.default_currency || "INR";
  const transactions = txResult.success ? txResult.data || [] : [];
  const accounts = (accountsResult.data || []) as Account[];
  const categories = (categoriesResult.data || []) as Category[];

  return (
    <TransactionTable
      initialTransactions={transactions}
      accounts={accounts}
      categories={categories}
      defaultCurrency={defaultCurrency}
    />
  );
}
