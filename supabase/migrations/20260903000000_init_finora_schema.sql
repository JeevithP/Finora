-- ==============================================================================
-- FINORA — DATABASE FOUNDATION MIGRATION
-- Migration Version: 20260903000000_init_finora_schema.sql
-- Description: Core schema, constraints, indexes, triggers, reconciliation view,
--              default category seed data, and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- 2.1 PROFILES TABLE
-- 1:1 relationship with auth.users. Email is kept strictly in auth.users (single source of truth).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(100),
  default_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 ACCOUNTS TABLE
-- Tracks user asset and liability accounts.
-- Asset types: checking, savings, cash, investment (current_balance > 0 means assets owned)
-- Liability types: credit_card, loan (current_balance > 0 means debt owed)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'credit_card', 'loan')),
  initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  color VARCHAR(20) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'Landmark',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 CATEGORIES TABLE
-- Supports system default categories (user_id is NULL, is_system = true) and custom user categories.
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
  color VARCHAR(20) NOT NULL DEFAULT '#64748b',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 TRANSACTIONS TABLE
-- Authoritative financial ledger.
-- Single-row transfers use account_id (source) and destination_account_id (target).
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  original_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'refund')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: Transfers MUST have a distinct destination account and NO category
  CONSTRAINT chk_transfers_destination CHECK (
    (type = 'transfer' AND destination_account_id IS NOT NULL AND destination_account_id != account_id AND category_id IS NULL)
    OR
    (type != 'transfer' AND destination_account_id IS NULL)
  )
);

-- 2.5 BUDGETS TABLE
-- Monthly spending allowance allocated per category.
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year SMALLINT NOT NULL CHECK (year >= 2020),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_category_month_year UNIQUE (user_id, category_id, month, year)
);

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dest_account ON public.transactions(destination_account_id) WHERE destination_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

-- ==============================================================================
-- 4. BALANCE SYNCHRONIZATION TRIGGER FUNCTIONS
-- ==============================================================================

-- 4.1 Single-Account Delta Adjuster Helper Function
-- Calculates the exact signed balance adjustment according to account type and transaction type.
-- Multiplier: +1 applies the transaction, -1 reverses the transaction (for updates/deletions).
CREATE OR REPLACE FUNCTION public.fn_adjust_account_balance(
  p_account_id UUID,
  p_tx_type VARCHAR,
  p_amount NUMERIC,
  p_is_destination BOOLEAN,
  p_multiplier INTEGER
) RETURNS VOID AS $$
DECLARE
  v_acc_type VARCHAR;
  v_delta NUMERIC := 0;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT type INTO v_acc_type FROM public.accounts WHERE id = p_account_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_acc_type IN ('checking', 'savings', 'cash', 'investment') THEN
    -- ASSET ACCOUNTS: current_balance represents assets owned (>0)
    IF p_tx_type = 'income' THEN
      v_delta := p_amount * p_multiplier;
    ELSIF p_tx_type = 'expense' THEN
      v_delta := -p_amount * p_multiplier;
    ELSIF p_tx_type = 'refund' THEN
      v_delta := p_amount * p_multiplier;
    ELSIF p_tx_type = 'transfer' THEN
      IF p_is_destination THEN
        v_delta := p_amount * p_multiplier;  -- Incoming transfer increases asset balance
      ELSE
        v_delta := -p_amount * p_multiplier; -- Outgoing transfer decreases asset balance
      END IF;
    END IF;

  ELSIF v_acc_type IN ('credit_card', 'loan') THEN
    -- LIABILITY ACCOUNTS: current_balance represents debt owed (>0)
    IF p_tx_type = 'expense' THEN
      v_delta := p_amount * p_multiplier;  -- Credit purchase increases debt
    ELSIF p_tx_type = 'refund' THEN
      v_delta := -p_amount * p_multiplier; -- Card refund decreases debt
    ELSIF p_tx_type = 'income' THEN
      v_delta := -p_amount * p_multiplier; -- Direct income/credit reduces debt
    ELSIF p_tx_type = 'transfer' THEN
      IF p_is_destination THEN
        v_delta := -p_amount * p_multiplier; -- Paying credit card bill from bank reduces debt
      ELSE
        v_delta := p_amount * p_multiplier;  -- Cash advance / borrowing from card increases debt
      END IF;
    END IF;
  END IF;

  UPDATE public.accounts
  SET current_balance = current_balance + v_delta,
      updated_at = now()
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4.2 Main Balance Sync Trigger Function
-- Ensures atomic balance synchronization on INSERT, UPDATE, and DELETE.
-- For UPDATE, reverses the exact effect of the OLD row and applies the NEW row.
CREATE OR REPLACE FUNCTION public.fn_sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Apply NEW transaction on source account
    PERFORM public.fn_adjust_account_balance(NEW.account_id, NEW.type, NEW.amount, false, 1);
    -- If transfer, apply NEW transaction on destination account
    IF NEW.type = 'transfer' AND NEW.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(NEW.destination_account_id, NEW.type, NEW.amount, true, 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 1. Reverse OLD transaction effects from OLD accounts
    PERFORM public.fn_adjust_account_balance(OLD.account_id, OLD.type, OLD.amount, false, -1);
    IF OLD.type = 'transfer' AND OLD.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(OLD.destination_account_id, OLD.type, OLD.amount, true, -1);
    END IF;

    -- 2. Apply NEW transaction effects to NEW accounts
    PERFORM public.fn_adjust_account_balance(NEW.account_id, NEW.type, NEW.amount, false, 1);
    IF NEW.type = 'transfer' AND NEW.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(NEW.destination_account_id, NEW.type, NEW.amount, true, 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse OLD transaction effects from OLD accounts
    PERFORM public.fn_adjust_account_balance(OLD.account_id, OLD.type, OLD.amount, false, -1);
    IF OLD.type = 'transfer' AND OLD.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(OLD.destination_account_id, OLD.type, OLD.amount, true, -1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Attach trigger to public.transactions
DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_account_balance();

-- ==============================================================================
-- 5. RECONCILIATION VIEW
-- ==============================================================================

-- Calculates the authoritative balance dynamically from initial_balance + transactions
-- to audit the cached accounts.current_balance column for 100% mathematical parity.
-- Uses security_invoker = true to ensure querying user RLS policies are enforced.
CREATE OR REPLACE VIEW public.v_account_balances WITH (security_invoker = true) AS
WITH transaction_deltas AS (
  SELECT
    t.account_id AS account_id,
    SUM(
      CASE
        -- Assets: income & refund add, expense & transfer-out subtract
        WHEN a.type IN ('checking', 'savings', 'cash', 'investment') THEN
          CASE
            WHEN t.type IN ('income', 'refund') THEN t.amount
            WHEN t.type IN ('expense', 'transfer') THEN -t.amount
            ELSE 0
          END
        -- Liabilities: expense & transfer-out add debt, refund & income subtract debt
        WHEN a.type IN ('credit_card', 'loan') THEN
          CASE
            WHEN t.type IN ('expense', 'transfer') THEN t.amount
            WHEN t.type IN ('refund', 'income') THEN -t.amount
            ELSE 0
          END
        ELSE 0
      END
    ) AS source_delta
  FROM public.accounts a
  LEFT JOIN public.transactions t ON t.account_id = a.id
  GROUP BY t.account_id, a.type
),
transfer_destination_deltas AS (
  SELECT
    t.destination_account_id AS account_id,
    SUM(
      CASE
        -- Assets: receiving transfer increases balance
        WHEN a.type IN ('checking', 'savings', 'cash', 'investment') THEN t.amount
        -- Liabilities: receiving transfer (bill payment) decreases debt
        WHEN a.type IN ('credit_card', 'loan') THEN -t.amount
        ELSE 0
      END
    ) AS dest_delta
  FROM public.accounts a
  LEFT JOIN public.transactions t ON t.destination_account_id = a.id
  WHERE t.type = 'transfer'
  GROUP BY t.destination_account_id, a.type
)
SELECT
  a.id AS account_id,
  a.user_id,
  a.name AS account_name,
  a.type AS account_type,
  a.initial_balance,
  a.current_balance AS stored_balance,
  (
    a.initial_balance +
    COALESCE(td.source_delta, 0) +
    COALESCE(tdd.dest_delta, 0)
  ) AS calculated_balance,
  (
    a.current_balance = (
      a.initial_balance +
      COALESCE(td.source_delta, 0) +
      COALESCE(tdd.dest_delta, 0)
    )
  ) AS is_reconciled
FROM public.accounts a
LEFT JOIN transaction_deltas td ON td.account_id = a.id
LEFT JOIN transfer_destination_deltas tdd ON tdd.account_id = a.id;

-- ==============================================================================
-- 6. AUTH PROFILE TRIGGER
-- ==============================================================================

-- Automatically creates a public.profiles record when a new user signs up in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, default_currency, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'default_currency', 'INR'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. DEFAULT SYSTEM CATEGORIES SEED DATA
-- ==============================================================================

INSERT INTO public.categories (id, user_id, name, type, icon, color, is_system)
VALUES
  -- Expense Categories
  (gen_random_uuid(), NULL, 'Housing & Rent', 'expense', 'Home', '#3b82f6', true),
  (gen_random_uuid(), NULL, 'Groceries', 'expense', 'ShoppingCart', '#10b981', true),
  (gen_random_uuid(), NULL, 'Dining & Food', 'expense', 'Utensils', '#f59e0b', true),
  (gen_random_uuid(), NULL, 'Transportation & Fuel', 'expense', 'Car', '#8b5cf6', true),
  (gen_random_uuid(), NULL, 'Utilities & Bills', 'expense', 'Zap', '#ef4444', true),
  (gen_random_uuid(), NULL, 'Entertainment & Leisure', 'expense', 'Film', '#ec4899', true),
  (gen_random_uuid(), NULL, 'Healthcare & Medical', 'expense', 'HeartPulse', '#06b6d4', true),
  (gen_random_uuid(), NULL, 'Shopping & Electronics', 'expense', 'ShoppingBag', '#6366f1', true),
  (gen_random_uuid(), NULL, 'Education & Learning', 'expense', 'GraduationCap', '#14b8a6', true),
  (gen_random_uuid(), NULL, 'Personal Care', 'expense', 'Sparkles', '#f97316', true),
  (gen_random_uuid(), NULL, 'Other Expense', 'expense', 'CircleEllipsis', '#6b7280', true),
  -- Income Categories
  (gen_random_uuid(), NULL, 'Salary', 'income', 'Briefcase', '#10b981', true),
  (gen_random_uuid(), NULL, 'Freelance & Consulting', 'income', 'Laptop', '#3b82f6', true),
  (gen_random_uuid(), NULL, 'Investments & Dividends', 'income', 'TrendingUp', '#8b5cf6', true),
  (gen_random_uuid(), NULL, 'Rental Income', 'income', 'Building', '#f59e0b', true),
  (gen_random_uuid(), NULL, 'Gifts & Grants', 'income', 'Gift', '#ec4899', true),
  (gen_random_uuid(), NULL, 'Other Income', 'income', 'Coins', '#6b7280', true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 8.1 PROFILES POLICIES
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 8.2 ACCOUNTS POLICIES
CREATE POLICY "accounts_select_own"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- 8.3 CATEGORIES POLICIES (Users can view system categories + own categories)
CREATE POLICY "categories_select_own_or_system"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "categories_insert_own"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "categories_update_own"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "categories_delete_own"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- 8.4 TRANSACTIONS POLICIES (Strict subquery verification defeating cross-user references)
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = account_id AND user_id = auth.uid()
    )
    AND (
      destination_account_id IS NULL OR EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = destination_account_id AND user_id = auth.uid()
      )
    )
    AND (
      category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = category_id AND (user_id = auth.uid() OR is_system = true)
      )
    )
    AND (
      original_transaction_id IS NULL OR EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = original_transaction_id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = account_id AND user_id = auth.uid()
    )
    AND (
      destination_account_id IS NULL OR EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = destination_account_id AND user_id = auth.uid()
      )
    )
    AND (
      category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = category_id AND (user_id = auth.uid() OR is_system = true)
      )
    )
    AND (
      original_transaction_id IS NULL OR EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = original_transaction_id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- 8.5 BUDGETS POLICIES
CREATE POLICY "budgets_select_own"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "budgets_insert_own"
  ON public.budgets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = category_id AND (user_id = auth.uid() OR is_system = true)
    )
  );

CREATE POLICY "budgets_update_own"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = category_id AND (user_id = auth.uid() OR is_system = true)
    )
  );

CREATE POLICY "budgets_delete_own"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);
