import React from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { createClient } from "@/lib/supabase/server";
import { TRANSACTION_SELECT_QUERY } from "@/lib/constants";
import type { TransactionWithRelations } from "@/actions/transactions";
import { Account, Category } from "@/types/database.types";
import { parseTransactionSearchParams } from "@/lib/validations/transaction";
import { TransactionTable } from "@/components/transactions/transaction-table";

export const dynamic = "force-dynamic";

interface TransactionsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const rawParams = searchParams ? await searchParams : {};
  const params = parseTransactionSearchParams(rawParams);

  const supabase = await createClient();

  // Helper to build filtered query
  const buildFilteredQuery = (
    page: number,
    pageSize: number,
    includeCount = false
  ) => {
    let query = supabase
      .from("transactions")
      .select(
        TRANSACTION_SELECT_QUERY,
        includeCount ? { count: "exact" } : undefined
      )
      .eq("user_id", user.id);

    // 1. Text Search across description and notes
    if (params.q) {
      const sanitized = params.q.replace(/[,.()%\\_]/g, " ").trim();
      if (sanitized) {
        query = query.or(
          `description.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`
        );
      }
    }

    // 2. Account Filter (matches source OR transfer destination)
    if (params.account !== "all") {
      query = query.or(
        `account_id.eq.${params.account},destination_account_id.eq.${params.account}`
      );
    }

    // 3. Category Filter
    if (params.category !== "all") {
      if (params.category === "uncategorized") {
        query = query.is("category_id", null);
      } else {
        query = query.eq("category_id", params.category);
      }
    }

    // 4. Type Filter
    if (params.type !== "all") {
      query = query.eq("type", params.type);
    }

    // 5. Deterministic Ordering (Date DESC, CreatedAt DESC, ID DESC)
    query = query
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    // 6. Range pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return query.range(from, to);
  };

  // Parallelize independent data fetches: user profile, accounts, categories, total ledger count, and filtered transactions
  const [
    profile,
    accountsResult,
    categoriesResult,
    totalLedgerResult,
    transactionsResult,
  ] = await Promise.all([
    getUserProfile(user.id),
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
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    buildFilteredQuery(params.page, params.pageSize, true),
  ]);

  const defaultCurrency = profile?.default_currency || "INR";
  const accounts = (accountsResult.data || []) as Account[];
  const categories = (categoriesResult.data || []) as Category[];
  const totalLedgerCount = totalLedgerResult.count ?? 0;
  const hasAnyTransactions = totalLedgerCount > 0;

  let transactions = (transactionsResult.data ||
    []) as unknown as TransactionWithRelations[];
  const totalCount = transactionsResult.count ?? 0;
  let currentPage = params.page;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));

  // If user requested an out-of-range page (e.g. page 5 when only 1 page exists), gracefully fallback to page 1
  if (transactions.length === 0 && totalCount > 0 && currentPage > 1) {
    currentPage = 1;
    const clampedResult = await buildFilteredQuery(1, params.pageSize, false);
    transactions = (clampedResult.data ||
      []) as unknown as TransactionWithRelations[];
  }

  return (
    <TransactionTable
      initialTransactions={transactions}
      accounts={accounts}
      categories={categories}
      defaultCurrency={defaultCurrency}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={params.pageSize}
      totalPages={totalPages}
      hasAnyTransactions={hasAnyTransactions}
      filters={{
        q: params.q,
        account: params.account,
        category: params.category,
        type: params.type,
      }}
    />
  );
}
