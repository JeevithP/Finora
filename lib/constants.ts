export const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking / Salary", icon: "Landmark" },
  { value: "savings", label: "Savings Account", icon: "PiggyBank" },
  { value: "credit_card", label: "Credit Card", icon: "CreditCard" },
  { value: "investment", label: "Investment / Demat", icon: "TrendingUp" },
  { value: "cash", label: "Cash / Wallet", icon: "Wallet" },
  { value: "loan", label: "Loan / Mortgage", icon: "Receipt" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

export const TRANSACTION_TYPES = [
  { value: "expense", label: "Expense", color: "text-rose-500" },
  { value: "income", label: "Income", color: "text-emerald-500" },
  { value: "transfer", label: "Transfer", color: "text-sky-500" },
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number]["value"];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar (USD)", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro (EUR)", locale: "en-DE" },
  { code: "GBP", symbol: "£", name: "British Pound (GBP)", locale: "en-GB" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Housing & Rent", icon: "Home", color: "#3B82F6" },
  { name: "Groceries", icon: "ShoppingCart", color: "#10B981" },
  { name: "Dining & Food", icon: "Utensils", color: "#F59E0B" },
  { name: "Transportation & Fuel", icon: "Car", color: "#8B5CF6" },
  { name: "Utilities & Bills", icon: "Zap", color: "#EF4444" },
  { name: "Entertainment & Leisure", icon: "Film", color: "#EC4899" },
  { name: "Healthcare & Medical", icon: "HeartPulse", color: "#06B6D4" },
  { name: "Shopping & Electronics", icon: "ShoppingBag", color: "#6366F1" },
  { name: "Education & Learning", icon: "GraduationCap", color: "#14B8A6" },
  { name: "Personal Care", icon: "Sparkles", color: "#F97316" },
  { name: "Other Expense", icon: "CircleEllipsis", color: "#6B7280" },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", icon: "Briefcase", color: "#10B981" },
  { name: "Freelance & Consulting", icon: "Laptop", color: "#3B82F6" },
  { name: "Investments & Dividends", icon: "TrendingUp", color: "#8B5CF6" },
  { name: "Rental Income", icon: "Building", color: "#F59E0B" },
  { name: "Gifts & Grants", icon: "Gift", color: "#EC4899" },
  { name: "Other Income", icon: "Coins", color: "#6B7280" },
] as const;
