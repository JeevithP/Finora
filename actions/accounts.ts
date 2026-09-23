"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
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
