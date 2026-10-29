# AGENTS.md — CashPulse System Context & Execution Instructions

## 1. Project Identity & Mission
**Project Name:** CashPulse — AI-Powered Cash Flow Forecasting & Working Capital Copilot  
**Core Purpose:** Help SMEs proactively manage cash flow through deterministic 13-week rolling cash forecasts, shortfall detection, and human-in-the-loop AI copilot recommendations (overdue collection drafts, payment delay suggestions, working capital actions).

---

## 2. Technical Stack Architecture
- **Backend:** Python 3.11+ | FastAPI | SQLModel ORM | SQLite (Development) / PostgreSQL (Production)
- **Agent Orchestration:** LangGraph | Pydantic v2 (Structured Outputs & Tools)
- **Frontend:** Next.js 15 (App Router) | TypeScript | Tailwind CSS | shadcn/ui | Recharts / Tremor
- **Execution Environment:** Virtual environment isolated at `./venv`

---

## 3. Strict Operating Rules for AI Agents

### Rule 1: No Deterministic Math in LLM Calls
- **CRITICAL:** Do NOT delegate financial arithmetic, sum aggregations, moving averages, or time-series projections to an LLM.
- All 13-week cash projections, running balances, and shortfall calculations MUST be executed by deterministic Python code (`pandas`, `numpy`, or standard statistical modules in `app/services/`).
- The LLM agent is strictly reserved for:
  1. Reading structured forecast output JSONs.
  2. Executing typed tool calls (`get_overdue_invoices`, `draft_collection_email`, `recommend_payment_delay`).
  3. Generating natural language summaries and draft actions for human review.

### Rule 2: Strict Human-in-the-Loop (HITL) Execution
- The AI Copilot MUST NEVER execute destructive or external actions autonomously (e.g., automatically sending emails, moving money, or updating invoice statuses).
- All AI recommendations must return a structured proposal with an `approval_required: true` flag to be rendered in the frontend approval drawer.

### Rule 3: Single Database Pattern & Audit Lineage
- Use SQLModel for all database operations. Do not introduce additional database ORMs or raw unvalidated SQL strings.
- Every action recommended by an agent must log the explicit database record IDs (e.g., `invoice_id`, `organization_id`) that triggered the suggestion to maintain strict data lineage.

### Rule 4: System Commands & Environment Safety
- Always execute Python commands using the virtual environment interpreter: `./venv/bin/python` or `./venv/bin/pytest`.
- Run backend verification via `http://127.0.0.1:8000/docs` after schema or route updates.
- Do NOT install new third-party dependencies without asking the user first.

---

## 4. Directory Structure Blueprint
cashpulse/
├── AGENTS.md                     # This agent instruction file
├── GEMINI.md                     # Quick agent environment rules
├── requirements.txt              # Core Python dependencies
├── cashpulse.db                  # Local SQLite database file
├── venv/                         # Python virtual environment (git-ignored)
└── app/
    ├── __init__.py
    ├── main.py                   # FastAPI application & lifecycle entrypoint
    ├── database.py               # Engine configuration & session management
    ├── models.py                 # SQLModel schemas (Org, Invoice, BankTx, Snapshot)
    ├── services/
    │   ├── __init__.py
    │   ├── generator.py          # Synthetic data generator using Faker
    │   └── forecast.py           # Deterministic 13-week forecast math engine
    └── agent/
        ├── __init__.py
        ├── state.py              # LangGraph state definitions
        ├── tools.py              # Typed Pydantic tools for the copilot
        └── graph.py              # LangGraph state machine & workflow graph


## 5. Domain Data Model Guidelines

### Double-Entry Directionality
- **Invoices (`Invoice`):**
  - `InvoiceType.AR` (Accounts Receivable) = Inflow (+)
  - `InvoiceType.AP` (Accounts Payable) = Outflow (-)
  - `expected_payment_date`: Key field used for cash timing in 13-week forecasts (accounts for client payment delays).
- **Bank Transactions (`BankTransaction`):**
  - Positive amounts represent realized deposits/inflows.
  - Negative amounts represent realized debits/outflows.

---

## 6. Development Roadmap & Milestones

### Phase 1: Core Engine & Data Ingestion (Current Phase)
- [x] **Task 1:** Project setup, `SQLModel` schemas, SQLite database setup, FastAPI lifespan application.
- [ ] **Task 2:** Build synthetic data generator (`app/services/generator.py`) using `Faker` to generate realistic, noisy AR/AP invoices and transactions with seasonal variations.
- [ ] **Task 3:** Build deterministic 13-week rolling cash flow calculation engine (`app/services/forecast.py`) and expose `/api/v1/forecast/13-week` endpoint.

### Phase 2: LangGraph Copilot & Tool Calling
- [ ] **Task 1:** Set up stateful LangGraph workflow (`app/agent/graph.py`).
- [ ] **Task 2:** Build Pydantic tools (`app/agent/tools.py`) to query low-water mark balances, fetch overdue invoices, and generate collection email drafts.
- [ ] **Task 3:** Implement structured output and audit trail logging.

### Phase 3: Next.js Dashboard & Human-in-the-Loop UI
- [ ] **Task 1:** Next.js 15 dashboard setup with Tailwind CSS and `shadcn/ui`.
- [ ] **Task 2:** Render 13-week time-series chart with Recharts/Tremor, highlighting red shortfall zones.
- [ ] **Task 3:** Interactive AI Copilot Action Drawer with "Approve / Edit / Reject" controls.

---

## 7. Verification Standard for Agents
Before concluding any task:
1. Ensure Python files have valid syntax and pass clean imports.
2. Verify that FastAPI starts without errors: `./venv/bin/python -m uvicorn app.main:app --reload`.
3. Confirm database tables are correctly created or updated in `cashpulse.db`.