"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAccountSchema,
  updateAccountSchema,
  adjustBalanceSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
  type AdjustBalanceInput,
} from "@/lib/validations/account";
import { Account } from "@/types/database.types";

export interface AccountActionResult {
  success: boolean;
  data?: Account;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createAccountAction(
  input: CreateAccountInput
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = createAccountSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid account details",
      fieldErrors,
    };
  }

  const { name, type, initialBalance, currency, color, icon } = result.data;

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type,
      initial_balance: initialBalance,
      current_balance: initialBalance,
      currency,
      color,
      icon,
      is_archived: false,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as Account,
  };
}

export async function updateAccountAction(
  input: UpdateAccountInput
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = updateAccountSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid account update details",
      fieldErrors,
    };
  }

  const { id, name, type, currency, color, icon } = result.data;

  // Verify existing account record
  const { data: existingAccount, error: fetchError } = await supabase
    .from("accounts")
    .select("id, user_id, type, currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existingAccount) {
    return {
      success: false,
      error: "Account not found or access denied.",
    };
  }

  // Check if account has any recorded transactions
  const { count: txCount, error: countError } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},destination_account_id.eq.${id}`);

  if (countError) {
    return {
      success: false,
      error: countError.message,
    };
  }

  // If transactions exist, reject type or currency mutations
  if (txCount && txCount > 0) {
    if (existingAccount.type !== type || existingAccount.currency !== currency) {
      return {
        success: false,
        error:
          "Account type and currency cannot be modified once transactions have been recorded in the ledger.",
      };
    }
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name,
      type,
      currency,
      color,
      icon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as Account,
  };
}

export async function toggleArchiveAccountAction(
  id: string,
  isArchived: boolean
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as Account,
  };
}

export async function deleteAccountAction(
  id: string
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  // Check if account has any recorded transactions
  const { count: txCount, error: countError } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},destination_account_id.eq.${id}`);

  if (countError) {
    return {
      success: false,
      error: countError.message,
    };
  }

  if (txCount && txCount > 0) {
    return {
      success: false,
      error:
        "This account has recorded financial transactions and cannot be deleted. Please archive the account instead to maintain historical records.",
    };
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return {
    success: true,
  };
}

export async function adjustAccountBalanceAction(
  input: AdjustBalanceInput
): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = adjustBalanceSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error:
        result.error.issues[0]?.message || "Invalid balance adjustment details",
    };
  }

  const data = result.data;

  // 1. Fetch target account
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", data.accountId)
    .eq("user_id", user.id)
    .single();

  if (accError || !account) {
    return {
      success: false,
      error: "Account not found or access denied.",
    };
  }

  if (data.mode === "opening_balance") {
    // Mode 1: Opening balance correction
    const oldInitial = Number(account.initial_balance);
    const newInitial = Number(data.newInitialBalance);
    const diff = newInitial - oldInitial;

    if (diff === 0) {
      return {
        success: true,
        data: account,
      };
    }

    // Call atomic RPC function fn_correct_opening_balance (with row locking to eliminate read-modify-write race)
    const rpcRes = await supabase.rpc("fn_correct_opening_balance", {
      p_account_id: account.id,
      p_new_initial_balance: newInitial,
    });

    if (!rpcRes.error && rpcRes.data) {
      revalidatePath("/accounts");
      revalidatePath("/dashboard");
      revalidatePath("/transactions");

      return {
        success: true,
        data: rpcRes.data as unknown as Account,
      };
    }

    // If RPC returned an actual business/permission error (not PGRST202), fail immediately
    if (rpcRes.error && rpcRes.error.code !== "PGRST202") {
      return {
        success: false,
        error: rpcRes.error.message,
      };
    }

    // Fallback strictly when RPC is not installed (e.g. before migration runs)
    const currentBal = Number(account.current_balance);
    const newCurrent = currentBal + diff;

    const { data: updatedAcc, error: updateError } = await supabase
      .from("accounts")
      .update({
        initial_balance: newInitial,
        current_balance: newCurrent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    return {
      success: true,
      data: updatedAcc as Account,
    };
  } else {
    // Mode 2: Reconcile current balance via ledger adjustment transaction
    const currentBal = Number(account.current_balance);
    const targetBal = Number(data.targetCurrentBalance);
    const diff = targetBal - currentBal;

    if (diff === 0) {
      return {
        success: false,
        error: "Target balance matches current balance. No adjustment needed.",
      };
    }

    const isIncrease = diff > 0;
    const adjustmentType: "increase" | "decrease" = isIncrease
      ? "increase"
      : "decrease";
    const amount = Math.abs(diff);

    const defaultDesc =
      account.type === "credit_card" || account.type === "loan"
        ? isIncrease
          ? "Balance Adjustment (Debt Increase)"
          : "Balance Adjustment (Debt Decrease)"
        : isIncrease
          ? "Balance Adjustment (Increase)"
          : "Balance Adjustment (Decrease)";

    const description = data.description?.trim() || defaultDesc;

    // Insert auditable transaction (PostgreSQL trigger trg_sync_account_balance atomically updates account.current_balance)
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: account.id,
      destination_account_id: null,
      category_id: null,
      type: "adjustment",
      adjustment_type: adjustmentType,
      amount,
      date: data.date.split("T")[0],
      description,
      notes: data.notes || null,
    });

    if (txError) {
      return {
        success: false,
        error: txError.message,
      };
    }

    // Fetch refreshed account
    const { data: refreshedAcc } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", account.id)
      .single();

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    return {
      success: true,
      data: (refreshedAcc || account) as Account,
    };
  }
}

