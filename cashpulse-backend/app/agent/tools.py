from datetime import date, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from sqlmodel import Session, select

from app.database import engine
from app.models import Invoice, InvoiceType, InvoiceStatus, BankTransaction, Organization


# ==========================================
# 1. Tool Input Schemas (Pydantic Validation)
# ==========================================

class OverdueInvoicesInput(BaseModel):
    organization_id: int = Field(description="The ID of the organization to query")
    invoice_type: Optional[str] = Field(
        default=None,
        description="Filter by invoice type: 'AR' (Receivables) or 'AP' (Payables). Omit for both.",
    )
    min_amount: float = Field(
        default=0.0,
        description="Minimum invoice amount threshold to filter by",
    )
    limit: int = Field(
        default=20,
        description="Maximum number of overdue invoices to return (default 20)",
    )


class UpcomingPayablesInput(BaseModel):
    organization_id: int = Field(description="The ID of the organization to query")
    days_ahead: int = Field(
        default=30,
        description="Number of days into the future to look for upcoming payables (default 30)",
    )
    limit: int = Field(
        default=20,
        description="Maximum number of payable records to return (default 20)",
    )


class HistoricalExpensesInput(BaseModel):
    organization_id: int = Field(description="The ID of the organization to query")
    lookback_days: int = Field(
        default=90,
        description="Number of historical days to inspect (default 90)",
    )
    category: Optional[str] = Field(
        default=None,
        description="Filter by specific OPEX category (e.g., 'Payroll', 'Rent', 'Software SaaS', 'Utilities')",
    )


class InvoiceFactoringInput(BaseModel):
    organization_id: int = Field(description="The ID of the organization to simulate factoring for")
    invoice_ids: Optional[List[int]] = Field(
        default=None,
        description="List of specific invoice IDs to factor. If omitted, automatically selects top eligible AR invoices.",
    )
    advance_rate: float = Field(
        default=0.85,
        description="The loan-to-value advance rate (default 0.85 = 85%)",
    )
    discount_fee_pct: float = Field(
        default=0.03,
        description="The factoring fee / discount rate percentage (default 0.03 = 3%)",
    )


# ==========================================
# 2. Tool Implementations with @tool
# ==========================================

@tool(args_schema=OverdueInvoicesInput)
def get_overdue_invoices(
    organization_id: int,
    invoice_type: Optional[str] = None,
    min_amount: float = 0.0,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Retrieve overdue accounts receivable (money owed by customers) and
    accounts payable (bills owed to vendors) for an organization, calculating
    days past due and partner concentration.
    """
    today = date.today()
    with Session(engine) as session:
        statement = select(Invoice).where(
            Invoice.organization_id == organization_id,
            Invoice.status != InvoiceStatus.PAID,
            Invoice.amount >= min_amount,
        )
        if invoice_type:
            statement = statement.where(Invoice.invoice_type == invoice_type.upper())

        all_unpaid = session.exec(statement).all()

        overdue_invoices: List[Dict[str, Any]] = []
        total_overdue_ar = 0.0
        total_overdue_ap = 0.0

        for inv in all_unpaid:
            effective_due = inv.due_date
            if effective_due < today or inv.status == InvoiceStatus.OVERDUE:
                days_overdue = max((today - effective_due).days, 1)
                inv_record = {
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "invoice_type": inv.invoice_type.value,
                    "amount": round(inv.amount, 2),
                    "client_or_vendor": inv.client_or_vendor,
                    "due_date": inv.due_date.isoformat(),
                    "expected_payment_date": inv.expected_payment_date.isoformat()
                    if inv.expected_payment_date
                    else None,
                    "days_overdue": days_overdue,
                    "status": inv.status.value,
                }
                overdue_invoices.append(inv_record)

                if inv.invoice_type == InvoiceType.AR:
                    total_overdue_ar += inv.amount
                else:
                    total_overdue_ap += inv.amount

        # Sort by amount descending
        overdue_invoices.sort(key=lambda x: x["amount"], reverse=True)
        trimmed = overdue_invoices[:limit]

        return {
            "organization_id": organization_id,
            "as_of_date": today.isoformat(),
            "total_overdue_count": len(overdue_invoices),
            "total_overdue_ar": round(total_overdue_ar, 2),
            "total_overdue_ap": round(total_overdue_ap, 2),
            "top_overdue_invoices": trimmed,
        }


@tool(args_schema=UpcomingPayablesInput)
def get_upcoming_payables(
    organization_id: int,
    days_ahead: int = 30,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Retrieve pending vendor payables (AP) due within the next N days.
    Identifies major supplier obligations scheduled before liquidity troughs
    to prioritize Net-30 payment term extension negotiations.
    """
    today = date.today()
    cutoff_date = today + timedelta(days=days_ahead)

    with Session(engine) as session:
        statement = select(Invoice).where(
            Invoice.organization_id == organization_id,
            Invoice.invoice_type == InvoiceType.AP,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
        )
        invoices = session.exec(statement).all()

        upcoming: List[Dict[str, Any]] = []
        total_upcoming_ap = 0.0

        for inv in invoices:
            target_date = inv.expected_payment_date or inv.due_date
            # Include upcoming or past due (unpaid liabilities)
            if target_date <= cutoff_date:
                days_until_due = (target_date - today).days
                upcoming.append(
                    {
                        "id": inv.id,
                        "invoice_number": inv.invoice_number,
                        "vendor": inv.client_or_vendor,
                        "amount": round(inv.amount, 2),
                        "due_date": inv.due_date.isoformat(),
                        "effective_payment_date": target_date.isoformat(),
                        "days_until_due": days_until_due,
                        "status": inv.status.value,
                    }
                )
                total_upcoming_ap += inv.amount

        # Sort largest bills first
        upcoming.sort(key=lambda x: x["amount"], reverse=True)
        trimmed = upcoming[:limit]

        return {
            "organization_id": organization_id,
            "window_days": days_ahead,
            "total_upcoming_ap": round(total_upcoming_ap, 2),
            "total_payables_count": len(upcoming),
            "top_payables": trimmed,
        }


@tool(args_schema=HistoricalExpensesInput)
def get_historical_expenses(
    organization_id: int,
    lookback_days: int = 90,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Analyze historical cash outflows from BankTransactions across the lookback period.
    Breaks down burn rate by category (Payroll, Rent, Software SaaS, Utilities, Miscellaneous)
    to identify cost reduction opportunities and operating runway leakage.
    """
    today = date.today()
    cutoff = today - timedelta(days=lookback_days)

    with Session(engine) as session:
        statement = select(BankTransaction).where(
            BankTransaction.organization_id == organization_id,
            BankTransaction.transaction_date >= cutoff,
            BankTransaction.transaction_date <= today,
            BankTransaction.amount < 0,
        )
        if category:
            statement = statement.where(BankTransaction.category == category)

        txs = session.exec(statement).all()

        category_totals: Dict[str, float] = {}
        total_outflow = 0.0

        for tx in txs:
            amt = abs(tx.amount)
            category_totals[tx.category] = category_totals.get(tx.category, 0.0) + amt
            total_outflow += amt

        # Calculate approximate monthly run-rate (assuming 30 days per month)
        months = max(lookback_days / 30.0, 1.0)
        monthly_run_rate = {
            cat: round(tot / months, 2) for cat, tot in category_totals.items()
        }

        # Format sorted categories
        breakdown = [
            {
                "category": cat,
                "total_spend": round(tot, 2),
                "monthly_average": monthly_run_rate.get(cat, 0.0),
                "percentage_of_total": round(100.0 * tot / total_outflow, 1)
                if total_outflow > 0
                else 0.0,
            }
            for cat, tot in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "organization_id": organization_id,
            "lookback_days": lookback_days,
            "total_operating_spend": round(total_outflow, 2),
            "average_monthly_burn": round(total_outflow / months, 2),
            "categories": breakdown,
        }


@tool(args_schema=InvoiceFactoringInput)
def simulate_invoice_factoring(
    organization_id: int,
    invoice_ids: Optional[List[int]] = None,
    advance_rate: float = 0.85,
    discount_fee_pct: float = 0.03,
) -> Dict[str, Any]:
    """
    Simulate an asset-based working capital advance (invoice factoring) on
    eligible accounts receivable. Calculates immediate 24-hour liquidity unlocked,
    factoring fees, and escrow reserve rebate.
    """
    with Session(engine) as session:
        statement = select(Invoice).where(
            Invoice.organization_id == organization_id,
            Invoice.invoice_type == InvoiceType.AR,
            Invoice.status != InvoiceStatus.PAID,
        )
        if invoice_ids:
            statement = statement.where(Invoice.id.in_(invoice_ids))

        ar_invoices = session.exec(statement).all()

        if not ar_invoices:
            return {
                "organization_id": organization_id,
                "eligible_ar_volume": 0.0,
                "immediate_cash_advance": 0.0,
                "factoring_fee": 0.0,
                "reserve_rebate": 0.0,
                "invoices_selected": [],
                "note": "No eligible unpaid AR invoices found for factoring.",
            }

        # If no specific IDs provided, select top 5 largest receivables
        sorted_invoices = sorted(ar_invoices, key=lambda x: x.amount, reverse=True)
        selected = sorted_invoices if invoice_ids else sorted_invoices[:5]

        total_volume = sum(inv.amount for inv in selected)
        advance_amount = round(total_volume * advance_rate, 2)
        fee_amount = round(total_volume * discount_fee_pct, 2)
        reserve_amount = round(total_volume - advance_amount - fee_amount, 2)

        factored_list = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer": inv.client_or_vendor,
                "gross_amount": round(inv.amount, 2),
                "advance_value": round(inv.amount * advance_rate, 2),
                "due_date": inv.due_date.isoformat(),
            }
            for inv in selected
        ]

        return {
            "organization_id": organization_id,
            "eligible_ar_volume": round(total_volume, 2),
            "advance_rate": advance_rate,
            "immediate_cash_advance": advance_amount,
            "factoring_fee": fee_amount,
            "reserve_rebate": reserve_amount,
            "net_liquidity_gain": advance_amount,
            "invoices_selected": factored_list,
        }


# Export list of all copilot tools for LLM binding or introspection
COPILOT_TOOLS = [
    get_overdue_invoices,
    get_upcoming_payables,
    get_historical_expenses,
    simulate_invoice_factoring,
]
