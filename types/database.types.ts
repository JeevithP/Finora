export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "investment"
  | "credit_card"
  | "loan";

export type TransactionType = "income" | "expense" | "transfer" | "refund";

export type CategoryType = "expense" | "income";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          initial_balance: number;
          current_balance: number;
          currency: string;
          color: string | null;
          icon: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: AccountType;
          initial_balance?: number;
          current_balance?: number;
          currency?: string;
          color?: string | null;
          icon?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          initial_balance?: number;
          current_balance?: number;
          currency?: string;
          color?: string | null;
          icon?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: CategoryType;
          icon: string;
          color: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: CategoryType;
          icon?: string;
          color?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: CategoryType;
          icon?: string;
          color?: string;
          is_system?: boolean;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          destination_account_id: string | null;
          category_id: string | null;
          original_transaction_id: string | null;
          type: TransactionType;
          amount: number;
          date: string;
          description: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          destination_account_id?: string | null;
          category_id?: string | null;
          original_transaction_id?: string | null;
          type: TransactionType;
          amount: number;
          date?: string;
          description: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          destination_account_id?: string | null;
          category_id?: string | null;
          original_transaction_id?: string | null;
          type?: TransactionType;
          amount?: number;
          date?: string;
          description?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          month?: number;
          year?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      v_account_balances: {
        Row: {
          account_id: string;
          user_id: string;
          account_name: string;
          account_type: AccountType;
          initial_balance: number;
          stored_balance: number;
          calculated_balance: number;
          is_reconciled: boolean;
        };
      };
    };
    Functions: {
      fn_adjust_account_balance: {
        Args: {
          p_account_id: string;
          p_tx_type: string;
          p_amount: number;
          p_is_destination: boolean;
          p_multiplier: number;
        };
        Returns: void;
      };
      fn_sync_account_balance: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
  };
}
