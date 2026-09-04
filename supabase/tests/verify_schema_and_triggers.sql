-- ==============================================================================
-- FINORA — VERIFICATION & TEST SUITE FOR SCHEMA, TRIGGERS & CONSTRAINTS
-- File: supabase/tests/verify_schema_and_triggers.sql
-- Description: Unit test suite for the Finora financial ledger engine:
--              balance synchronization, sign conventions, transfers, reversals,
--              constraint rejections, atomic rollback, and RLS predicate simulation.
--
-- NOTE ON ARCHITECTURAL BOUNDARIES & LIMITATIONS:
-- 1. Profile Creation Trigger (`handle_new_user`):
--    `auth.users` is managed exclusively by the Supabase Auth daemon (GoTrue).
--    Real profile generation on signup is verified in Milestone 2 via live Supabase Auth.
--    This test suite focuses on the core financial ledger engine (accounts, transactions, budgets).
-- 2. RLS Execution vs Predicate Simulation:
--    This SQL script runs in a single transaction as a database migration test.
--    Test 13 tests the exact Boolean predicate expressions used in the RLS policies,
--    NOT runtime RLS isolation under an active authenticated JWT context.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a UUID := '11111111-1111-4111-8111-111111111111';
  v_user_b UUID := '22222222-2222-4222-8222-222222222222';

  v_hdfc_checking UUID;
  v_sbi_savings UUID;
  v_hdfc_credit_card UUID;
  v_user_b_account UUID;

  v_groceries_cat UUID;
  v_salary_cat UUID;
  v_user_b_cat UUID;

  v_tx_id UUID;
  v_transfer_id UUID;
  v_bal NUMERIC;
  v_debt NUMERIC;
  v_net_worth NUMERIC;
  v_error_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'STARTING FINORA DATABASE FOUNDATION TEST SUITE';
  RAISE NOTICE '==================================================';

  -- 1. Setup Mock Auth Users (if running in Supabase environment with auth schema)
  -- If auth.users is accessible, insert mock users so foreign keys are valid.
  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
    VALUES
      (v_user_a, 'user_a@finora.test', '{"full_name": "User A", "default_currency": "INR"}'::jsonb, 'authenticated', 'authenticated'),
      (v_user_b, 'user_b@finora.test', '{"full_name": "User B", "default_currency": "INR"}'::jsonb, 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE '✓ Mock auth.users records initialized';
  EXCEPTION WHEN OTHERS THEN
    -- If auth schema is not directly writable in the test environment, insert directly into profiles
    INSERT INTO public.profiles (id, full_name, default_currency)
    VALUES
      (v_user_a, 'User A', 'INR'),
      (v_user_b, 'User B', 'INR')
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'ℹ Auth schema bypassed; profiles initialized directly (Limitation documented)';
  END;

  -- 2. Create Accounts for User A
  -- HDFC Checking: Asset, initial ₹100,000
  INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, currency)
  VALUES (v_user_a, 'HDFC Checking', 'checking', 100000.00, 100000.00, 'INR')
  RETURNING id INTO v_hdfc_checking;

  -- SBI Savings: Asset, initial ₹50,000
  INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, currency)
  VALUES (v_user_a, 'SBI Savings', 'savings', 50000.00, 50000.00, 'INR')
  RETURNING id INTO v_sbi_savings;

  -- HDFC Credit Card: Liability, initial debt ₹0
  INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, currency)
  VALUES (v_user_a, 'HDFC Regalia Credit Card', 'credit_card', 0.00, 0.00, 'INR')
  RETURNING id INTO v_hdfc_credit_card;

  -- User B Account
  INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, currency)
  VALUES (v_user_b, 'User B Axis Bank', 'checking', 50000.00, 50000.00, 'INR')
  RETURNING id INTO v_user_b_account;

  -- Categories
  SELECT id INTO v_groceries_cat FROM public.categories WHERE name = 'Groceries' LIMIT 1;
  SELECT id INTO v_salary_cat FROM public.categories WHERE name = 'Salary' LIMIT 1;

  INSERT INTO public.categories (user_id, name, type, is_system)
  VALUES (v_user_b, 'User B Secret Project', 'expense', false)
  RETURNING id INTO v_user_b_cat;

  -- ==============================================================================
  -- TEST 1: INSERT INCOME ON ASSET ACCOUNT
  -- Expected: HDFC Checking becomes 100,000 + 50,000 = 150,000
  -- ==============================================================================
  INSERT INTO public.transactions (user_id, account_id, category_id, type, amount, description)
  VALUES (v_user_a, v_hdfc_checking, v_salary_cat, 'income', 50000.00, 'Monthly Salary');

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 150000.00, format('TEST 1 FAILED: Expected 150000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 1 PASSED: Income added to Asset account correctly (Balance: %)', v_bal;

  -- ==============================================================================
  -- TEST 2: INSERT EXPENSE ON ASSET ACCOUNT
  -- Expected: HDFC Checking becomes 150,000 - 10,000 = 140,000
  -- ==============================================================================
  INSERT INTO public.transactions (user_id, account_id, category_id, type, amount, description)
  VALUES (v_user_a, v_hdfc_checking, v_groceries_cat, 'expense', 10000.00, 'Supermarket Groceries')
  RETURNING id INTO v_tx_id;

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 140000.00, format('TEST 2 FAILED: Expected 140000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 2 PASSED: Expense deducted from Asset account correctly (Balance: %)', v_bal;

  -- ==============================================================================
  -- TEST 3: INSERT CREDIT CARD EXPENSE (LIABILITY ACCOUNT)
  -- Expected: Credit Card Debt increases from 0 to 30,000
  -- ==============================================================================
  INSERT INTO public.transactions (user_id, account_id, category_id, type, amount, description)
  VALUES (v_user_a, v_hdfc_credit_card, v_groceries_cat, 'expense', 30000.00, 'Flight Tickets on Card');

  SELECT current_balance INTO v_debt FROM public.accounts WHERE id = v_hdfc_credit_card;
  ASSERT v_debt = 30000.00, format('TEST 3 FAILED: Expected debt 30000, got %s', v_debt);
  RAISE NOTICE '✓ TEST 3 PASSED: Credit Card purchase increases debt correctly (Debt: %)', v_debt;

  -- ==============================================================================
  -- TEST 4: ASSET-TO-ASSET TRANSFER (HDFC Checking -> SBI Savings ₹20,000)
  -- Expected: HDFC Checking = 140,000 - 20,000 = 120,000
  --           SBI Savings = 50,000 + 20,000 = 70,000
  -- ==============================================================================
  INSERT INTO public.transactions (user_id, account_id, destination_account_id, type, amount, description)
  VALUES (v_user_a, v_hdfc_checking, v_sbi_savings, 'transfer', 20000.00, 'Savings deposit')
  RETURNING id INTO v_transfer_id;

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 120000.00, format('TEST 4a FAILED: Expected 120000, got %s', v_bal);

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_sbi_savings;
  ASSERT v_bal = 70000.00, format('TEST 4b FAILED: Expected 70000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 4 PASSED: Single-record transfer updated source & destination atomically';

  -- ==============================================================================
  -- TEST 5: CREDIT CARD PAYMENT (HDFC Checking -> Credit Card ₹30,000)
  -- Expected: HDFC Checking = 120,000 - 30,000 = 90,000
  --           Credit Card Debt = 30,000 - 30,000 = 0.00
  --           Net worth invariant: Assets - Liabilities = (90k + 70k) - 0 = 160,000
  -- ==============================================================================
  INSERT INTO public.transactions (user_id, account_id, destination_account_id, type, amount, description)
  VALUES (v_user_a, v_hdfc_checking, v_hdfc_credit_card, 'transfer', 30000.00, 'Credit Card Bill Payment');

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 90000.00, format('TEST 5a FAILED: Expected 90000, got %s', v_bal);

  SELECT current_balance INTO v_debt FROM public.accounts WHERE id = v_hdfc_credit_card;
  ASSERT v_debt = 0.00, format('TEST 5b FAILED: Expected 0.00 debt, got %s', v_debt);

  -- Net Worth Invariant Check
  SELECT (SUM(CASE WHEN type IN ('checking', 'savings') THEN current_balance ELSE 0 END) -
          SUM(CASE WHEN type IN ('credit_card') THEN current_balance ELSE 0 END))
  INTO v_net_worth
  FROM public.accounts
  WHERE user_id = v_user_a;

  ASSERT v_net_worth = 160000.00, format('TEST 5c FAILED: Expected Net Worth 160000, got %s', v_net_worth);
  RAISE NOTICE '✓ TEST 5 PASSED: Credit card payment reduced checking and card debt with exact Net Worth preservation';

  -- ==============================================================================
  -- TEST 6: UPDATE TRANSACTION AMOUNT (Old Expense 10,000 -> New Expense 7,000)
  -- Expected: HDFC Checking was 90,000. Reversing 10,000 makes it 100,000.
  --           Applying 7,000 makes it 93,000 (Account ends up exactly ₹3,000 higher).
  -- ==============================================================================
  UPDATE public.transactions
  SET amount = 7000.00
  WHERE id = v_tx_id;

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 93000.00, format('TEST 6 FAILED: Expected 93000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 6 PASSED: UPDATE amount reversal applied correctly (90,000 -> 93,000)';

  -- ==============================================================================
  -- TEST 7: UPDATE TRANSACTION ACCOUNT (Move 7,000 Expense from HDFC to SBI)
  -- Expected: HDFC gets 7,000 restored (93,000 -> 100,000)
  --           SBI gets 7,000 deducted (70,000 -> 63,000)
  -- ==============================================================================
  UPDATE public.transactions
  SET account_id = v_sbi_savings
  WHERE id = v_tx_id;

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = 100000.00, format('TEST 7a FAILED: Expected HDFC 100000, got %s', v_bal);

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_sbi_savings;
  ASSERT v_bal = 63000.00, format('TEST 7b FAILED: Expected SBI 63000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 7 PASSED: UPDATE account change restored previous account and debited new account';

  -- ==============================================================================
  -- TEST 8: DELETE TRANSACTION (Delete the 7,000 Expense on SBI)
  -- Expected: SBI gets 7,000 restored back to 70,000
  -- ==============================================================================
  DELETE FROM public.transactions WHERE id = v_tx_id;

  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_sbi_savings;
  ASSERT v_bal = 70000.00, format('TEST 8 FAILED: Expected SBI 70000, got %s', v_bal);
  RAISE NOTICE '✓ TEST 8 PASSED: DELETE transaction reversed impact cleanly';

  -- ==============================================================================
  -- TEST 9: CONSTRAINT TEST — TRANSFER WITH CATEGORY REJECTION
  -- A transfer with a non-null category_id MUST be rejected by chk_transfers_destination.
  -- ==============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.transactions (user_id, account_id, destination_account_id, category_id, type, amount, description)
    VALUES (v_user_a, v_hdfc_checking, v_sbi_savings, v_groceries_cat, 'transfer', 5000.00, 'Invalid Transfer with Category');
  EXCEPTION WHEN check_violation THEN
    v_error_caught := true;
  END;

  ASSERT v_error_caught = true, 'TEST 9 FAILED: Transfer with category_id was NOT rejected!';
  RAISE NOTICE '✓ TEST 9 PASSED: Transfer with non-null category_id was successfully rejected by check constraint';

  -- ==============================================================================
  -- TEST 10: CONSTRAINT TEST — TRANSFER WITH SAME SOURCE & DESTINATION REJECTION
  -- Transfer where account_id = destination_account_id MUST be rejected.
  -- ==============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.transactions (user_id, account_id, destination_account_id, type, amount, description)
    VALUES (v_user_a, v_hdfc_checking, v_hdfc_checking, 'transfer', 5000.00, 'Self Transfer');
  EXCEPTION WHEN check_violation THEN
    v_error_caught := true;
  END;

  ASSERT v_error_caught = true, 'TEST 10 FAILED: Self transfer was NOT rejected!';
  RAISE NOTICE '✓ TEST 10 PASSED: Self transfer was successfully rejected by check constraint';

  -- ==============================================================================
  -- TEST 11: CONSTRAINT TEST — NON-TRANSFER WITH DESTINATION ACCOUNT REJECTION
  -- Expense with destination_account_id MUST be rejected.
  -- ==============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.transactions (user_id, account_id, destination_account_id, category_id, type, amount, description)
    VALUES (v_user_a, v_hdfc_checking, v_sbi_savings, v_groceries_cat, 'expense', 5000.00, 'Invalid Expense with Destination');
  EXCEPTION WHEN check_violation THEN
    v_error_caught := true;
  END;

  ASSERT v_error_caught = true, 'TEST 11 FAILED: Expense with destination_account_id was NOT rejected!';
  RAISE NOTICE '✓ TEST 11 PASSED: Expense with destination_account_id was successfully rejected by check constraint';

  -- ==============================================================================
  -- TEST 12: CONSTRAINT VIOLATION ROLLBACK — ILLEGAL AMOUNT
  -- Verifies that when an insert fails a check constraint (e.g. amount <= 0),
  -- the operation aborts cleanly without leaving partial balance mutations.
  -- ==============================================================================
  SELECT current_balance INTO v_bal FROM public.accounts WHERE id = v_hdfc_checking;
  BEGIN
    -- Insert with illegal negative amount fails chk_amount (amount > 0)
    INSERT INTO public.transactions (user_id, account_id, category_id, type, amount, description)
    VALUES (v_user_a, v_hdfc_checking, v_salary_cat, 'income', -500.00, 'Illegal Negative Amount');
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  SELECT current_balance INTO v_debt FROM public.accounts WHERE id = v_hdfc_checking;
  ASSERT v_bal = v_debt, 'TEST 12 FAILED: Account balance changed during rolled-back statement!';
  RAISE NOTICE '✓ TEST 12 PASSED: Constraint violation aborted statement cleanly with zero balance mutation';

  -- ==============================================================================
  -- TEST 13: RLS POLICY PREDICATE VALIDATION (SIMULATION)
  -- Tests the Boolean SQL expressions used in RLS WITH CHECK / USING subqueries to verify
  -- that cross-tenant references evaluate to FALSE for User A targeting User B resources.
  -- (Note: Runtime RLS enforcement under active JWT context is tested in Milestone 2).
  -- ==============================================================================
  -- 13a. User A attempting to use User B's account
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = v_user_b_account AND user_id = v_user_a
  ), 'TEST 13a FAILED: Cross-user account ownership predicate should evaluate to false';

  -- 13b. User A attempting to use User B's private custom category
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = v_user_b_cat AND (user_id = v_user_a OR is_system = true)
  ), 'TEST 13b FAILED: Cross-user category ownership predicate should evaluate to false';

  -- 13c. User A accessing system default category (should evaluate to true)
  ASSERT EXISTS (
    SELECT 1 FROM public.categories WHERE id = v_groceries_cat AND (user_id = v_user_a OR is_system = true)
  ), 'TEST 13c FAILED: System category access predicate should evaluate to true';

  RAISE NOTICE '✓ TEST 13 PASSED: RLS cross-tenant ownership predicates evaluate to FALSE for User B resources';

  -- ==============================================================================
  -- TEST 14: RECONCILIATION VIEW AUDIT
  -- All accounts must have is_reconciled = true
  -- ==============================================================================
  PERFORM 1 FROM public.v_account_balances WHERE user_id = v_user_a AND is_reconciled = false;
  IF FOUND THEN
    RAISE EXCEPTION 'TEST 14 FAILED: Reconciliation mismatch detected in v_account_balances!';
  END IF;
  RAISE NOTICE '✓ TEST 14 PASSED: All accounts in v_account_balances match stored balances perfectly (100%% Reconciled)';

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ALL 14 DATABASE FOUNDATION TESTS COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==================================================';
END $$;

ROLLBACK;
