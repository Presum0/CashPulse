from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from collections import defaultdict
from sqlmodel import Session, select

from app.models import (
    Organization,
    Invoice,
    InvoiceType,
    InvoiceStatus,
    BankTransaction,
)


def _infer_recurring_opex(
    session: Session, organization_id: int, as_of_date: date
) -> Dict[str, float]:
    """
    Analyzes historical BankTransactions to infer the monthly average expense
    for major OPEX categories (Payroll, Rent, Software SaaS, Utilities, Miscellaneous).
    """
    cutoff_date = as_of_date - timedelta(days=180)
    statement = select(BankTransaction).where(
        BankTransaction.organization_id == organization_id,
        BankTransaction.transaction_date >= cutoff_date,
        BankTransaction.transaction_date <= as_of_date,
        BankTransaction.amount < 0,
        BankTransaction.category.in_(
            ["Payroll", "Rent", "Software SaaS", "Utilities", "Miscellaneous"]
        ),
    )
    txs = session.exec(statement).all()

    # Track sum of expenses and distinct months per category
    category_totals = defaultdict(float)
    category_months = defaultdict(set)

    for tx in txs:
        month_key = (tx.transaction_date.year, tx.transaction_date.month)
        category_totals[tx.category] += abs(tx.amount)
        category_months[tx.category].add(month_key)

    opex_rates: Dict[str, float] = {}
    for cat in ["Payroll", "Rent", "Software SaaS", "Utilities", "Miscellaneous"]:
        months_count = len(category_months[cat])
        if months_count > 0:
            opex_rates[cat] = round(category_totals[cat] / months_count, 2)
        else:
            opex_rates[cat] = 0.0

    return opex_rates


def _project_invoices(
    session: Session,
    organization_id: int,
    start_date: date,
    end_date: date,
    today: date,
) -> Dict[date, Dict[str, float]]:
    """
    Maps all active, unpaid AR/AP invoices onto the 91-day projection window.
    - Overdue AP is scheduled on Day 1 (conservative liquidity view).
    - Overdue AR is scheduled on Day 7 (expected collection lag).
    - Future invoices are placed on expected_payment_date or due_date.
    """
    statement = select(Invoice).where(
        Invoice.organization_id == organization_id,
        Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
    )
    unpaid_invoices = session.exec(statement).all()

    # daily mapping: date -> {"ar_collections": float, "ap_payables": float}
    invoice_schedule: Dict[date, Dict[str, float]] = defaultdict(
        lambda: {"ar_collections": 0.0, "ap_payables": 0.0}
    )

    for inv in unpaid_invoices:
        target_date = inv.expected_payment_date or inv.due_date

        if target_date < today:
            # Overdue invoice handling
            if inv.invoice_type == InvoiceType.AP:
                effective_date = start_date  # Immediate outflow on Day 1
            else:
                effective_date = today + timedelta(days=7)  # Day 7 collection lag
        else:
            effective_date = target_date

        if start_date <= effective_date <= end_date:
            if inv.invoice_type == InvoiceType.AR:
                invoice_schedule[effective_date]["ar_collections"] += inv.amount
            else:
                invoice_schedule[effective_date]["ap_payables"] += inv.amount

    return invoice_schedule


def generate_13_week_forecast(
    session: Session,
    organization_id: int,
    as_of_date: Optional[date] = None,
) -> Optional[Dict[str, Any]]:
    """
    Simulates a 13-week (91-day) direct cash forecast starting from current cash position.
    Integrates unpaid AR/AP invoices and historical monthly recurring OPEX.
    Returns a Recharts-ready structured payload with metrics and weekly rollups.
    """
    org = session.get(Organization, organization_id)
    if not org:
        return None

    today = as_of_date or date.today()
    start_date = today + timedelta(days=1)
    end_date = today + timedelta(days=91)

    # 1. Infer recurring OPEX rates
    opex_rates = _infer_recurring_opex(session, organization_id, today)

    # 2. Map invoice inflows & outflows
    invoice_schedule = _project_invoices(
        session, organization_id, start_date, end_date, today
    )

    # 3. Simulate day-by-day cash position
    current_balance = org.current_cash_balance
    starting_balance = current_balance

    daily_forecasts: List[Dict[str, Any]] = []
    total_inflows = 0.0
    total_outflows = 0.0

    min_balance = current_balance
    min_date = start_date
    min_day_index = 1
    runway_day_index: Optional[int] = None

    for day_idx in range(1, 92):
        current_date = today + timedelta(days=day_idx)
        week_num = ((day_idx - 1) // 7) + 1
        opening_balance = current_balance

        # Invoice cash flows
        inv_data = invoice_schedule.get(
            current_date, {"ar_collections": 0.0, "ap_payables": 0.0}
        )
        ar_inflow = round(inv_data["ar_collections"], 2)
        ap_outflow = round(inv_data["ap_payables"], 2)

        # Recurring OPEX on characteristic monthly days
        payroll_outflow = 0.0
        rent_outflow = 0.0
        saas_outflow = 0.0
        util_outflow = 0.0
        misc_outflow = 0.0

        if current_date.day == 1:
            rent_outflow = opex_rates["Rent"]
        if current_date.day == 5:
            saas_outflow = opex_rates["Software SaaS"]
        if current_date.day == 12:
            util_outflow = opex_rates["Utilities"]
        if current_date.day == 28:
            payroll_outflow = opex_rates["Payroll"]
        if current_date.day in [10, 20]:
            misc_outflow = round(opex_rates["Miscellaneous"] / 2.0, 2)

        day_total_inflow = ar_inflow
        day_total_outflow = round(
            ap_outflow
            + payroll_outflow
            + rent_outflow
            + saas_outflow
            + util_outflow
            + misc_outflow,
            2,
        )
        net_cash_flow = round(day_total_inflow - day_total_outflow, 2)
        closing_balance = round(opening_balance + net_cash_flow, 2)

        total_inflows += day_total_inflow
        total_outflows += day_total_outflow

        # Low-water mark tracking
        if closing_balance < min_balance:
            min_balance = closing_balance
            min_date = current_date
            min_day_index = day_idx

        # Runway days detection (first day balance drops below zero)
        if closing_balance < 0 and runway_day_index is None:
            runway_day_index = day_idx

        daily_forecasts.append(
            {
                "date": current_date.isoformat(),
                "day_index": day_idx,
                "week_number": week_num,
                "opening_balance": opening_balance,
                "total_inflow": day_total_inflow,
                "total_outflow": day_total_outflow,
                "net_cash_flow": net_cash_flow,
                "closing_balance": closing_balance,
                "breakdown": {
                    "ar_collections": ar_inflow,
                    "ap_payables": ap_outflow,
                    "payroll": payroll_outflow,
                    "rent": rent_outflow,
                    "software_saas": saas_outflow,
                    "utilities": util_outflow,
                    "miscellaneous": misc_outflow,
                },
            }
        )

        current_balance = closing_balance

    # 4. Aggregate 13 Weekly Summaries
    weekly_summaries: List[Dict[str, Any]] = []
    for w in range(1, 14):
        start_idx = (w - 1) * 7
        end_idx = start_idx + 7
        week_days = daily_forecasts[start_idx:end_idx]

        w_opening = week_days[0]["opening_balance"]
        w_closing = week_days[-1]["closing_balance"]
        w_inflow = round(sum(d["total_inflow"] for d in week_days), 2)
        w_outflow = round(sum(d["total_outflow"] for d in week_days), 2)
        w_net = round(w_inflow - w_outflow, 2)
        w_min = min(d["closing_balance"] for d in week_days)

        weekly_summaries.append(
            {
                "week_number": w,
                "start_date": week_days[0]["date"],
                "end_date": week_days[-1]["date"],
                "opening_balance": w_opening,
                "total_inflow": w_inflow,
                "total_outflow": w_outflow,
                "net_cash_flow": w_net,
                "closing_balance": w_closing,
                "low_balance_in_week": w_min,
            }
        )

    return {
        "organization_id": org.id,
        "organization_name": org.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "forecast_window": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_days": 91,
            "total_weeks": 13,
        },
        "summary_metrics": {
            "starting_cash_balance": round(starting_balance, 2),
            "ending_cash_balance": round(current_balance, 2),
            "net_cash_change": round(current_balance - starting_balance, 2),
            "total_projected_inflow": round(total_inflows, 2),
            "total_projected_outflow": round(total_outflows, 2),
            "low_water_mark": {
                "amount": round(min_balance, 2),
                "date": min_date.isoformat(),
                "day_index": min_day_index,
                "is_deficit": bool(min_balance < 0),
                "deficit_amount": round(abs(min_balance), 2)
                if min_balance < 0
                else 0.0,
            },
            "runway_days": runway_day_index,
            "is_at_risk": bool(min_balance < 0),
            "estimated_monthly_burn": round(sum(opex_rates.values()), 2),
        },
        "daily_forecast": daily_forecasts,
        "weekly_summary": weekly_summaries,
    }
