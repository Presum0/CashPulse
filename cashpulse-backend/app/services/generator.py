import random
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from faker import Faker
from sqlmodel import Session, select, delete

from app.models import (
    Organization,
    Invoice,
    InvoiceType,
    InvoiceStatus,
    BankTransaction,
    DailyCashSnapshot,
    ActionDraft,
)


def _clear_all(session: Session) -> None:
    """Wipes all rows from database in reverse foreign key order."""
    session.exec(delete(ActionDraft))
    session.exec(delete(DailyCashSnapshot))
    session.exec(delete(BankTransaction))
    session.exec(delete(Invoice))
    session.exec(delete(Organization))
    session.commit()



def _generate_organizations(session: Session, fake: Faker) -> List[Organization]:
    """Generates 2 demo organizations: one healthy SME and one cash-stressed SME."""
    now_utc = datetime.now(timezone.utc)
    org_healthy = Organization(
        name=f"{fake.company()} Technologies",
        current_cash_balance=125000.0,
        created_at=now_utc - timedelta(days=400),
    )
    org_stressed = Organization(
        name=f"{fake.company()} Logistics",
        current_cash_balance=32000.0,
        created_at=now_utc - timedelta(days=400),
    )

    session.add(org_healthy)
    session.add(org_stressed)
    session.commit()
    session.refresh(org_healthy)
    session.refresh(org_stressed)

    return [org_healthy, org_stressed]


def _generate_invoices(
    session: Session,
    org: Organization,
    fake: Faker,
    is_stressed: bool,
    today: date,
) -> List[Invoice]:
    """Generates AR and AP invoices for an organization."""
    # Pool of clients and vendors for realistic recurring relationships
    client_pool = [fake.company() for _ in range(8)]
    vendor_pool = [fake.company() for _ in range(8)]

    invoices: List[Invoice] = []
    invoice_count = 90 if not is_stressed else 95

    for i in range(1, invoice_count + 1):
        is_ar = random.random() < 0.55
        inv_type = InvoiceType.AR if is_ar else InvoiceType.AP

        # Issue date distributed over last 360 days
        days_ago = random.randint(5, 360)
        issue_d = today - timedelta(days=days_ago)
        term_days = random.choice([15, 30, 45, 60])
        due_d = issue_d + timedelta(days=term_days)

        # Status distribution
        rand_status = random.random()
        if is_ar:
            amount = round(random.uniform(1200.0, 48000.0), 2)
            partner = random.choice(client_pool)
            if due_d < today:
                # Past due: could be paid or overdue
                if rand_status < (0.60 if not is_stressed else 0.40):
                    status = InvoiceStatus.PAID
                else:
                    status = InvoiceStatus.OVERDUE
            else:
                # Future due
                if rand_status < 0.15:
                    status = InvoiceStatus.PAID  # paid early
                else:
                    status = InvoiceStatus.PENDING

            # Expected payment date logic: 30% late payment simulation
            if status == InvoiceStatus.PAID:
                expected_payment_d = None
            else:
                # If stressed org, late payment chance is higher (e.g. 45% vs 25%), averaging ~30-35%
                late_chance = 0.45 if is_stressed else 0.25
                if random.random() < late_chance:
                    # Late payment scenario: payment expected after due date
                    delay_days = random.randint(7, 45)
                    expected_payment_d = due_d + timedelta(days=delay_days)
                else:
                    # On time or slightly early
                    lead_days = random.randint(0, 5)
                    expected_payment_d = due_d - timedelta(days=lead_days)
        else:
            amount = round(random.uniform(500.0, 25000.0), 2)
            partner = random.choice(vendor_pool)
            if due_d < today:
                if rand_status < (0.80 if not is_stressed else 0.60):
                    status = InvoiceStatus.PAID
                else:
                    status = InvoiceStatus.OVERDUE
            else:
                status = InvoiceStatus.PENDING

            if status == InvoiceStatus.PAID:
                expected_payment_d = None
            else:
                expected_payment_d = due_d

        inv = Invoice(
            invoice_number=f"INV-{org.id}-{1000 + i}",
            invoice_type=inv_type,
            amount=amount,
            issue_date=issue_d,
            due_date=due_d,
            expected_payment_date=expected_payment_d,
            status=status,
            client_or_vendor=partner,
            organization_id=org.id,  # type: ignore
            created_at=datetime.combine(issue_d, datetime.min.time(), tzinfo=timezone.utc),
        )
        session.add(inv)
        invoices.append(inv)

    session.commit()
    for inv in invoices:
        session.refresh(inv)

    return invoices


def _generate_bank_transactions(
    session: Session,
    org: Organization,
    invoices: List[Invoice],
    fake: Faker,
    is_stressed: bool,
    today: date,
) -> List[BankTransaction]:
    """Generates realized cash flow transactions from paid invoices + recurring overhead."""
    transactions: List[BankTransaction] = []

    # 1. Invoice-correlated transactions for settled invoices
    for inv in invoices:
        if inv.status == InvoiceStatus.PAID:
            # Settle date roughly around due date or issue date
            offset = random.randint(-5, 5)
            settle_date = inv.due_date + timedelta(days=offset)
            if settle_date > today:
                settle_date = today - timedelta(days=random.randint(0, 3))
            if settle_date < inv.issue_date:
                settle_date = inv.issue_date + timedelta(days=2)

            if inv.invoice_type == InvoiceType.AR:
                amount = inv.amount  # Positive inflow
                category = "Client Payment"
                desc = f"Payment received for {inv.invoice_number} - {inv.client_or_vendor}"
            else:
                amount = -inv.amount  # Negative outflow
                category = "Vendor Payment"
                desc = f"Payment to {inv.client_or_vendor} ({inv.invoice_number})"

            tx = BankTransaction(
                transaction_date=settle_date,
                amount=amount,
                description=desc,
                category=category,
                organization_id=org.id,  # type: ignore
            )
            session.add(tx)
            transactions.append(tx)

    # 2. Recurring operational expenses over the past 12 months
    start_date = today - timedelta(days=365)
    current_iter = start_date.replace(day=1)

    while current_iter <= today:
        month_label = current_iter.strftime("%b %Y")

        # Payroll (around 28th of each month)
        payroll_date = min(today, current_iter + timedelta(days=27))
        if start_date <= payroll_date <= today:
            payroll_amt = -round(random.uniform(14000, 22000) if not is_stressed else random.uniform(9000, 15000), 2)
            tx_payroll = BankTransaction(
                transaction_date=payroll_date,
                amount=payroll_amt,
                description=f"Monthly payroll - {month_label}",
                category="Payroll",
                organization_id=org.id,  # type: ignore
            )
            session.add(tx_payroll)
            transactions.append(tx_payroll)

        # Rent (1st of month)
        rent_date = min(today, current_iter)
        if start_date <= rent_date <= today:
            rent_amt = -round(random.uniform(3500, 5000) if not is_stressed else random.uniform(2200, 3200), 2)
            tx_rent = BankTransaction(
                transaction_date=rent_date,
                amount=rent_amt,
                description=f"Office lease - {month_label}",
                category="Rent",
                organization_id=org.id,  # type: ignore
            )
            session.add(tx_rent)
            transactions.append(tx_rent)

        # SaaS tools (5th of month)
        saas_date = min(today, current_iter + timedelta(days=4))
        if start_date <= saas_date <= today:
            saas_amt = -round(random.uniform(600, 1500) if not is_stressed else random.uniform(300, 800), 2)
            tx_saas = BankTransaction(
                transaction_date=saas_date,
                amount=saas_amt,
                description=f"Software subscriptions - {month_label}",
                category="Software SaaS",
                organization_id=org.id,  # type: ignore
            )
            session.add(tx_saas)
            transactions.append(tx_saas)

        # Utilities (12th of month)
        util_date = min(today, current_iter + timedelta(days=11))
        if start_date <= util_date <= today:
            util_amt = -round(random.uniform(300, 750) if not is_stressed else random.uniform(200, 450), 2)
            tx_util = BankTransaction(
                transaction_date=util_date,
                amount=util_amt,
                description=f"Utilities - {month_label}",
                category="Utilities",
                organization_id=org.id,  # type: ignore
            )
            session.add(tx_util)
            transactions.append(tx_util)

        # 1-3 Miscellaneous operational expenses per month
        for _ in range(random.randint(1, 3)):
            misc_day_offset = random.randint(2, 26)
            misc_date = current_iter + timedelta(days=misc_day_offset)
            if start_date <= misc_date <= today:
                misc_amt = -round(random.uniform(80, 1200), 2)
                tx_misc = BankTransaction(
                    transaction_date=misc_date,
                    amount=misc_amt,
                    description=fake.catch_phrase(),
                    category="Miscellaneous",
                    organization_id=org.id,  # type: ignore
                )
                session.add(tx_misc)
                transactions.append(tx_misc)

        # Advance to next month
        if current_iter.month == 12:
            current_iter = current_iter.replace(year=current_iter.year + 1, month=1)
        else:
            current_iter = current_iter.replace(month=current_iter.month + 1)

    session.commit()
    for tx in transactions:
        session.refresh(tx)

    return transactions


def _generate_daily_snapshots(
    session: Session,
    org: Organization,
    transactions: List[BankTransaction],
    today: date,
) -> List[DailyCashSnapshot]:
    """Computes daily cash closing balance forward from start balance and persists snapshots."""
    # Map transactions to dates
    daily_delta: Dict[date, float] = {}
    for tx in transactions:
        daily_delta[tx.transaction_date] = daily_delta.get(tx.transaction_date, 0.0) + tx.amount

    start_date = today - timedelta(days=365)
    snapshots: List[DailyCashSnapshot] = []

    # Starting balance 365 days ago
    running_balance = org.current_cash_balance

    current_day = start_date
    while current_day <= today:
        net_change = daily_delta.get(current_day, 0.0)
        running_balance = round(running_balance + net_change, 2)

        snap = DailyCashSnapshot(
            organization_id=org.id,  # type: ignore
            snapshot_date=current_day,
            closing_balance=running_balance,
        )
        session.add(snap)
        snapshots.append(snap)
        current_day += timedelta(days=1)

    # Sync organization's current_cash_balance with final closing balance
    org.current_cash_balance = running_balance
    session.add(org)
    session.commit()

    return snapshots


def seed_all(session: Session, seed_value: int = 42) -> Dict[str, Any]:
    """
    Master orchestrator:
    1. Wipes existing database rows.
    2. Seeds 2 demo organizations (healthy and cash-stressed).
    3. Populates AR/AP invoices with realistic status and delay distributions.
    4. Populates realized bank transactions correlated with paid invoices + monthly recurring expenses.
    5. Computes and saves 365 daily cash snapshots per org, syncing the final balance.
    """
    random.seed(seed_value)
    fake = Faker()
    Faker.seed(seed_value)

    _clear_all(session)

    today = date.today()
    orgs = _generate_organizations(session, fake)

    total_invoices = 0
    total_transactions = 0
    total_snapshots = 0

    for i, org in enumerate(orgs):
        is_stressed = (i == 1)
        invoices = _generate_invoices(session, org, fake, is_stressed, today)
        txs = _generate_bank_transactions(session, org, invoices, fake, is_stressed, today)
        snaps = _generate_daily_snapshots(session, org, txs, today)

        total_invoices += len(invoices)
        total_transactions += len(txs)
        total_snapshots += len(snaps)

    return {
        "status": "seeded",
        "seed_value": seed_value,
        "organizations": len(orgs),
        "invoices": total_invoices,
        "bank_transactions": total_transactions,
        "daily_snapshots": total_snapshots,
    }


def seed_new_organization(
    session: Session,
    org: Organization,
    is_stressed: bool = True,
) -> Dict[str, Any]:
    """
    Populates starter ledger records (invoices, bank transactions, daily snapshots)
    for a newly provisioned tenant organization so the dashboard and copilot have rich, live data.
    """
    fake = Faker()
    today = date.today()

    invoices = _generate_invoices(session, org, fake, is_stressed, today)
    txs = _generate_bank_transactions(session, org, invoices, fake, is_stressed, today)
    snaps = _generate_daily_snapshots(session, org, txs, today)

    return {
        "organization_id": org.id,
        "invoices": len(invoices),
        "transactions": len(txs),
        "snapshots": len(snaps),
    }

