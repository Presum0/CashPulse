# Project: CashPulse — AI-Powered Cash Flow Forecasting & Working Capital Copilot

## Stack Architecture:
- **Backend:** Python 3.11+ + FastAPI + SQLModel + SQLite (dev) / PostgreSQL (prod) + LangGraph
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts

## Commands:
- **Backend:** `./venv/bin/python -m uvicorn app.main:app --reload`
- **Frontend:** `npm run dev`, `npm run build`, `npm run lint`

## Rules:
- **Deterministic Math:** Do not delegate financial arithmetic, rolling totals, or cash forecasts to LLMs. Math stays in Python (`pandas`/statistical functions); LLMs handle natural language analysis, tools, and email drafts.
- **Backend Quality:** Verify every API endpoint on FastAPI `/docs` (`http://127.0.0.1:8000/docs`) after schema or logic changes. Fix all type and import errors before completing tasks.
- **Frontend Quality:** Run `npm run build` and `npm run lint` after UI edits. Verify interactive charts and components in the browser.
- **Dependency Control:** No new third-party packages or libraries without explicit approval.
- **Human-in-the-Loop:** Ensure AI copilot actions (e.g., sending emails, delaying payments) always go through an explicit user approval workflow.

## Design & Engineering Direction:
- **UI/UX Inspiration:** Clean, modern FinTech aesthetic inspired by Stripe, Mercury, and Linear. Clean typography, high scannability, subtle border contrasts, and interactive time-series charts.
- **Ledger Design:** Double-entry ledger principles with strict separation between Accounts Receivable (AR), Accounts Payable (AP), and realized bank transactions.