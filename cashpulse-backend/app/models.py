from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class InvoiceType(str, Enum):
    AR = "AR"  # Accounts Receivable (Customer owes money to org)
    AP = "AP"  # Accounts Payable (Org owes money to vendor)

class InvoiceStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"

class ActionDraftStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"

# --- Organization Schema ---
class OrganizationBase(SQLModel):
    name: str = Field(index=True)
    currency: str = Field(default="USD")
    monthly_burn: float = Field(default=0.0)
    policy_floor: float = Field(default=0.0)
    current_cash_balance: float = Field(default=0.0)

class Organization(OrganizationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    invoices: List["Invoice"] = Relationship(back_populates="organization")
    transactions: List["BankTransaction"] = Relationship(back_populates="organization")
    action_drafts: List["ActionDraft"] = Relationship(back_populates="organization")
    plaid_items: List["PlaidItem"] = Relationship(back_populates="organization")
    accounting_connections: List["AccountingConnection"] = Relationship(back_populates="organization")

# --- Invoice Schema (Pending & Expected Cash Flows) ---
class InvoiceBase(SQLModel):
    invoice_number: str = Field(index=True)
    invoice_type: InvoiceType
    amount: float
    issue_date: date
    due_date: date
    expected_payment_date: Optional[date] = None  # Crucial for cash forecast timing
    status: InvoiceStatus = Field(default=InvoiceStatus.PENDING)
    client_or_vendor: str
    organization_id: int = Field(foreign_key="organization.id")

class Invoice(InvoiceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    organization: Optional[Organization] = Relationship(back_populates="invoices")

# --- Bank Transaction Schema (Historical Realized Cash Flows) ---
class BankTransactionBase(SQLModel):
    transaction_date: date = Field(index=True)
    amount: float  # Positive = Inflow, Negative = Outflow
    description: str
    category: str  # e.g., "Payroll", "Software SaaS", "Client Payment"
    organization_id: int = Field(foreign_key="organization.id")

class BankTransaction(BankTransactionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    organization: Optional[Organization] = Relationship(back_populates="transactions")

# --- Daily Cash Snapshot Schema (For Historical Trend Graphs) ---
class DailyCashSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organization.id")
    snapshot_date: date = Field(index=True)
    closing_balance: float

# --- Action Draft Schema (Remediation Proposals & HITL Queue) ---
class ActionDraftBase(SQLModel):
    organization_id: int = Field(foreign_key="organization.id", index=True)
    recommendation_id: str = Field(index=True)
    action_type: str = Field(index=True)
    title: str
    description: str
    estimated_impact: float
    recipient: str
    subject: str
    draft_content: str
    metadata_json: Optional[str] = None
    approval_required: bool = Field(default=True)
    status: ActionDraftStatus = Field(default=ActionDraftStatus.PENDING)

class ActionDraft(ActionDraftBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    executed_at: Optional[datetime] = None

    organization: Optional[Organization] = Relationship(back_populates="action_drafts")

# --- Plaid Integration Schema (Connected Commercial Bank Items) ---
class PlaidItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organization.id", index=True)
    item_id: str = Field(index=True)
    access_token: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    accounts_count: int = Field(default=1)
    status: str = Field(default="active")
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    organization: Optional[Organization] = Relationship(back_populates="plaid_items")

# --- Accounting & ERP Schema (Xero / QuickBooks Online Connections) ---
class AccountingConnection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organization.id", index=True)
    provider: str = Field(index=True)  # "xero", "quickbooks", "netsuite"
    tenant_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    status: str = Field(default="connected")  # "connected", "expired", "disconnected"
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    organization: Optional[Organization] = Relationship(back_populates="accounting_connections")


