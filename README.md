# Finora — Personal Finance & Wealth Management Platform

Finora is a production-grade personal finance and wealth management platform designed for clarity, bank-grade security, and robust ledger accounting. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase PostgreSQL.

## 🚀 Live Production Deployment

- **Production URL:** [https://finora-ten-psi.vercel.app](https://finora-ten-psi.vercel.app)
- **Deployment Platform:** Vercel (Edge & Node.js Serverless Runtime)
- **Database & Auth:** Supabase Cloud (PostgreSQL 15+ with Row Level Security)

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React Server Components & Server Actions)
- **UI & Styling:** React 19, Tailwind CSS v4, Lucide Icons, Radix UI Primitives, Sonner
- **Validation:** Zod v4, React Hook Form
- **Backend & Database:** Supabase PostgreSQL with strict Row Level Security (RLS)
- **Authentication:** Supabase SSR (`@supabase/ssr`) with Next.js 16 `proxy.ts` request interception
- **Ledger Engine:** PostgreSQL trigger-enforced balance synchronization and `security_invoker` reconciliation views

---

## 🏗️ Architecture & Security Model

1. **Authoritative Financial Ledger:**
   - All balance changes are computed transactionally at the database level via PostgreSQL triggers (`fn_sync_account_balance_on_transaction`).
   - Account balances are continuously validated against the `v_account_balances` reconciliation view.
2. **Strict Multi-Tenant Row Level Security (RLS):**
   - Every table (`profiles`, `accounts`, `categories`, `transactions`, `budgets`) enforces user-level RLS policies.
   - Cross-user foreign key references (e.g., transfers, destination accounts, categories) are strictly validated against `auth.uid()`.
3. **Session & Route Protection:**
   - Root request interception via Next.js 16 `proxy.ts` using fast JWT claims decoding (`getClaims()`) to protect private routes (`/dashboard/*`) and redirect authenticated sessions from auth pages (`/login`, `/signup`).

---

## 📋 Environment Variables

To configure Finora locally or in production, define the following environment variables (see `.env.example`):

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Publishable / Anon API key |
| `NEXT_PUBLIC_APP_URL` | Canonical application URL for redirects (e.g. `http://localhost:3000` or production domain) |

> **Note:** Never commit private `.env.local` files or service-role keys. Production credentials must be configured securely in the deployment provider dashboard.

---

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JeevithP/Finora.git
   cd Finora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials.

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run production build:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🗺️ Product Roadmap

- [x] **M0: Project Initialization & UI Primitives**
- [x] **M1: Database Foundation, RLS, Triggers, & Reconciliation View**
- [x] **M2: Authentication & Protected Dashboard**
- [x] **M3: Production Deployment & Smoke Testing**
- [ ] **M4: Accounts Management**
- [ ] **M5: Transactions & Balance Trigger Validation**
- [ ] **M6: Category Budgets**
- [ ] **M7: Dashboard & Wealth Analytics**
- [ ] **M8: Smart Statement Import**
- [ ] **M9+: Advanced Features & Integrations**

