import { z } from "zod";

export const accountTypeSchema = z.enum([
  "checking",
  "savings",
  "cash",
  "investment",
  "credit_card",
  "loan",
]);

export type AccountType = z.infer<typeof accountTypeSchema>;

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Account name must be at least 2 characters" })
    .max(100, { message: "Account name cannot exceed 100 characters" }),
  type: accountTypeSchema,
  initialBalance: z
    .number()
    .min(-999999999999.99, { message: "Balance exceeds minimum limit" })
    .max(999999999999.99, { message: "Balance exceeds maximum limit" }),
  currency: z
    .string()
    .trim()
    .min(3, { message: "Currency code must be at least 3 characters" })
    .max(10, { message: "Currency code cannot exceed 10 characters" }),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "Invalid hex color format" }),
  icon: z.string().max(50),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  id: z.string().uuid({ message: "Invalid account identifier" }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Account name must be at least 2 characters" })
    .max(100, { message: "Account name cannot exceed 100 characters" }),
  type: accountTypeSchema,
  currency: z
    .string()
    .trim()
    .min(3, { message: "Currency code must be at least 3 characters" })
    .max(10, { message: "Currency code cannot exceed 10 characters" }),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "Invalid hex color format" }),
  icon: z.string().max(50),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const adjustBalanceSchema = z.discriminatedUnion("mode", [
  // Mode 1: Opening balance correction
  z.object({
    mode: z.literal("opening_balance"),
    accountId: z.string().uuid({ message: "Invalid account identifier" }),
    newInitialBalance: z
      .number({ message: "Initial balance must be a number" })
      .min(-999999999999.99, { message: "Balance exceeds minimum limit" })
      .max(999999999999.99, { message: "Balance exceeds maximum limit" }),
    reason: z
      .string()
      .trim()
      .max(255, { message: "Reason cannot exceed 255 characters" })
      .optional()
      .default(""),
  }),
  // Mode 2: Reconcile current balance via ledger adjustment
  z.object({
    mode: z.literal("current_balance"),
    accountId: z.string().uuid({ message: "Invalid account identifier" }),
    targetCurrentBalance: z
      .number({ message: "Target balance must be a number" })
      .min(-999999999999.99, { message: "Balance exceeds minimum limit" })
      .max(999999999999.99, { message: "Balance exceeds maximum limit" }),
    date: z
      .string()
      .trim()
      .min(1, { message: "Date is required" })
      .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, {
        message: "Invalid date format (YYYY-MM-DD expected)",
      }),
    description: z
      .string()
      .trim()
      .max(255, { message: "Description cannot exceed 255 characters" })
      .optional()
      .default(""),
    notes: z
      .string()
      .max(1000, { message: "Notes cannot exceed 1000 characters" })
      .nullable()
      .optional(),
  }),
]);

export type AdjustBalanceInput = z.input<typeof adjustBalanceSchema>;
