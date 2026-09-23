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
