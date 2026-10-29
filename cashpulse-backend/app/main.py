from contextlib import asynccontextmanager
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import FastAPI, Depends, Query, HTTPException, Path
from sqlmodel import Session, select
from app.database import create_db_and_tables, get_session
from app import models  # Ensures SQLModel metadata is populated before create_db_and_tables()
from app.services.generator import seed_all, seed_new_organization
from app.services.forecast import generate_13_week_forecast
from app.agent.graph import run_copilot_workflow
from app.services import plaid_service, accounting_service


class OrganizationCreate(BaseModel):
    name: str = Field(..., description="Organization legal entity name")
    currency: str = Field(default="USD", description="Currency symbol or ISO code (USD, EUR, GBP, INR)")
    monthly_burn: float = Field(default=0.0, description="Monthly recurring cash burn")
    policy_floor: float = Field(default=0.0, description="Minimum policy cash buffer floor")
    starting_cash: Optional[float] = Field(default=None, description="Starting cash balance")
    seed_demo_data: bool = Field(default=True, description="Whether to generate initial invoices and cash transactions")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on app startup
    create_db_and_tables()
    yield

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CashPulse Engine",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "system": "CashPulse Engine"}

@app.post("/seed")
def seed_database(
    seed: int = Query(default=42, description="Random seed for reproducible data"),
    session: Session = Depends(get_session),
):
    """Populate the database with synthetic demo data. Wipes existing data first."""
    result = seed_all(session=session, seed_value=seed)
    return result

@app.post("/api/v1/organizations")
def create_organization(
    req: OrganizationCreate,
    session: Session = Depends(get_session),
):
    """
    Provision a new SME organization tenant record.
    Persists organization into the database with initial settings,
    seeds starter ledger data, and runs initial copilot workflow.
    """
    starting_balance = req.starting_cash if req.starting_cash is not None else 100000.0
    new_org = models.Organization(
        name=req.name,
        currency=req.currency,
        monthly_burn=req.monthly_burn,
        policy_floor=req.policy_floor,
        current_cash_balance=starting_balance,
    )
    session.add(new_org)
    session.commit()
    session.refresh(new_org)

    if req.seed_demo_data:
        try:
            # Seed starter ledger invoices, transactions and daily snapshots
            seed_new_organization(session=session, org=new_org, is_stressed=True)
            # Run copilot to synthesize initial action drafts and risk evaluations
            run_copilot_workflow(session=session, organization_id=new_org.id)
        except Exception as e:
            print(f"Notice: Initial data seeding for org #{new_org.id}: {e}")

    session.refresh(new_org)

    return {
        "organization_id": new_org.id,
        "name": new_org.name,
        "currency": new_org.currency,
        "monthly_burn": new_org.monthly_burn,
        "policy_floor": new_org.policy_floor,
        "current_cash_balance": new_org.current_cash_balance,
        "status": "PROVISIONED",
    }

@app.get("/api/v1/organizations")
def list_organizations(
    session: Session = Depends(get_session),
):
    """List all provisioned organizations."""
    statement = select(models.Organization).order_by(models.Organization.id.desc())
    orgs = session.exec(statement).all()
    return [
        {
            "id": o.id,
            "name": o.name,
            "currency": getattr(o, "currency", "USD") or "USD",
            "current_cash_balance": o.current_cash_balance,
            "monthly_burn": getattr(o, "monthly_burn", 0.0) or 0.0,
            "policy_floor": getattr(o, "policy_floor", 0.0) or 0.0,
        }
        for o in orgs
    ]

@app.get("/api/v1/forecast/{organization_id}")
def get_13_week_forecast(
    organization_id: int = Path(..., description="The ID of the organization to forecast"),
    as_of_date: Optional[date] = Query(default=None, description="Forecast origin date (defaults to today)"),
    session: Session = Depends(get_session),
):
    """
    Generate a 13-week (91-day) direct cash forecast for an organization.
    Combines starting cash, expected AR/AP invoice cash flows, and recurring OPEX.
    """
    forecast = generate_13_week_forecast(
        session=session,
        organization_id=organization_id,
        as_of_date=as_of_date,
    )
    if not forecast:
        raise HTTPException(
            status_code=404,
            detail=f"Organization with ID {organization_id} not found",
        )
    return forecast

@app.post("/api/v1/copilot/analyze/{organization_id}")
def run_copilot_analysis(
    organization_id: int = Path(..., description="The ID of the organization for copilot analysis"),
    as_of_date: Optional[date] = Query(default=None, description="Analysis origin date (defaults to today)"),
    session: Session = Depends(get_session),
):
    """
    Execute the LangGraph AI Copilot workflow:
    1. Analyzes 13-week cash forecast.
    2. Detects acute liquidity deficits & buffer risks.
    3. Evaluates working capital mitigations (AR Factoring, AP Terms Extension, Credit Facilities).
    4. Synthesizes executive recommendations and reasoning trace.
    5. Generates structured, ready-to-execute Action Drafts requiring user approval.
    """
    result = run_copilot_workflow(
        session=session,
        organization_id=organization_id,
        as_of_date=as_of_date,
    )
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Organization with ID {organization_id} not found",
        )
    return result


class ActionExecutionRequest(BaseModel):
    decision: str = Field(default="APPROVE", description="Decision: 'APPROVE' or 'REJECT'")
    notes: Optional[str] = Field(default=None, description="Optional approval or rejection notes")


@app.get("/api/v1/copilot/actions/{organization_id}")
def list_action_drafts(
    organization_id: int = Path(..., description="The organization ID"),
    status: Optional[str] = Query(default=None, description="Filter by status: PENDING, APPROVED, REJECTED, EXECUTED"),
    session: Session = Depends(get_session),
):
    """List all generated Action Drafts and remediation proposals for an organization."""
    org = session.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization with ID {organization_id} not found")

    statement = select(models.ActionDraft).where(models.ActionDraft.organization_id == organization_id)
    if status:
        statement = statement.where(models.ActionDraft.status == status.upper())
    statement = statement.order_by(models.ActionDraft.created_at.desc())
    return session.exec(statement).all()


@app.post("/api/v1/copilot/actions/{action_id}/execute")
def execute_action_draft(
    action_id: int = Path(..., description="The ID of the ActionDraft to execute/approve"),
    req: Optional[ActionExecutionRequest] = None,
    session: Session = Depends(get_session),
):
    """
    Human-in-the-Loop (HITL) Action Approval & Execution:
    - Approves or Rejects a remediation proposal.
    - If APPROVED: Transitions status to EXECUTED and applies real ledger adjustments (e.g. extending AP payment dates).
    - If REJECTED: Transitions status to REJECTED.
    """
    draft = session.get(models.ActionDraft, action_id)
    if not draft:
        raise HTTPException(
            status_code=404,
            detail=f"ActionDraft with ID {action_id} not found in database.",
        )

    if req is None:
        req = ActionExecutionRequest()

    decision = (req.decision or "APPROVE").upper()
    now_utc = datetime.now(timezone.utc)

    if decision == "APPROVE":
        if draft.status == models.ActionDraftStatus.EXECUTED:
            return {
                "status": "EXECUTED",
                "action_id": draft.id,
                "action_type": draft.action_type,
                "title": draft.title,
                "executed_at": draft.executed_at.isoformat() if draft.executed_at else now_utc.isoformat(),
                "notes": req.notes,
                "ledger_impact": "Action was already approved and executed.",
                "message": f"ActionDraft #{draft.id} is already executed.",
            }

        draft.status = models.ActionDraftStatus.EXECUTED
        draft.executed_at = now_utc

        # Ledger Feedback: If vendor AP extension was approved, shift pending AP invoices forward by 30 days
        ledger_impact_notes = ""
        if draft.action_type == "EXTEND_AP_TERMS":
            ap_invoices = session.exec(
                select(models.Invoice).where(
                    models.Invoice.organization_id == draft.organization_id,
                    models.Invoice.invoice_type == models.InvoiceType.AP,
                    models.Invoice.status != models.InvoiceStatus.PAID,
                ).limit(5)
            ).all()

            for inv in ap_invoices:
                base_d = inv.expected_payment_date or inv.due_date
                inv.expected_payment_date = base_d + timedelta(days=30)
                session.add(inv)

            ledger_impact_notes = f"Extended payment dates by +30 days on {len(ap_invoices)} upcoming vendor bills."

        session.add(draft)
        session.commit()
        session.refresh(draft)

        return {
            "status": "EXECUTED",
            "action_id": draft.id,
            "action_type": draft.action_type,
            "title": draft.title,
            "executed_at": draft.executed_at.isoformat() if draft.executed_at else None,
            "notes": req.notes,
            "ledger_impact": ledger_impact_notes,
            "message": f"ActionDraft #{draft.id} successfully approved and executed.",
        }
    elif decision == "REJECT":
        draft.status = models.ActionDraftStatus.REJECTED
        session.add(draft)
        session.commit()
        session.refresh(draft)

        return {
            "status": "REJECTED",
            "action_id": draft.id,
            "action_type": draft.action_type,
            "title": draft.title,
            "notes": req.notes,
            "message": f"ActionDraft #{draft.id} was rejected by user.",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{req.decision}'. Accepted values are 'APPROVE' or 'REJECT'.",
        )


# =====================================================================
# PLAID FINANCIAL INGESTION API
# =====================================================================

class PlaidLinkTokenRequest(BaseModel):
    organization_id: int = Field(..., description="Target tenant organization ID")
    client_user_id: Optional[str] = None


class PlaidExchangeTokenRequest(BaseModel):
    public_token: str = Field(..., description="Plaid public token returned from Plaid Link widget")
    organization_id: int = Field(..., description="Target tenant organization ID")
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None


@app.post("/api/v1/plaid/create-link-token")
async def create_plaid_link_token(
    req: PlaidLinkTokenRequest,
    session: Session = Depends(get_session),
):
    """
    Creates a Plaid Link Token to initialize the Plaid Link flow in the frontend.
    Supports both live sandbox credentials and simulated local sandbox tokens.
    """
    org = session.get(models.Organization, req.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization #{req.organization_id} not found")

    res = await plaid_service.create_link_token(
        organization_id=req.organization_id,
        client_user_id=req.client_user_id,
    )
    return res


@app.post("/api/v1/plaid/exchange-token")
async def exchange_plaid_public_token(
    req: PlaidExchangeTokenRequest,
    session: Session = Depends(get_session),
):
    """
    Exchanges public token for access token, persists PlaidItem in SQLModel,
    and runs initial bank feeds and balance sync.
    """
    org = session.get(models.Organization, req.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization #{req.organization_id} not found")

    res = await plaid_service.exchange_public_token(
        session=session,
        public_token=req.public_token,
        organization_id=req.organization_id,
        institution_id=req.institution_id,
        institution_name=req.institution_name,
    )
    return res


@app.post("/api/v1/plaid/sync/{organization_id}")
async def sync_plaid_bank_data(
    organization_id: int = Path(..., description="The organization ID to sync bank feeds for"),
    session: Session = Depends(get_session),
):
    """
    Triggers bank feed and live cash balance synchronization from Plaid
    into CashPulse ledger tables (BankTransaction & DailyCashSnapshot).
    """
    org = session.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization #{organization_id} not found")

    summary = await plaid_service.sync_plaid_data(
        session=session,
        organization_id=organization_id,
    )
    return summary


@app.get("/api/v1/plaid/items/{organization_id}")
def list_connected_plaid_items(
    organization_id: int = Path(..., description="The organization ID"),
    session: Session = Depends(get_session),
):
    """Lists all active Plaid bank connections for an organization."""
    items = session.exec(
        select(models.PlaidItem).where(
            models.PlaidItem.organization_id == organization_id,
            models.PlaidItem.status == "active",
        )
    ).all()
    return [
        {
            "id": item.id,
            "institution_name": item.institution_name,
            "institution_id": item.institution_id,
            "status": item.status,
            "accounts_count": item.accounts_count,
            "last_synced_at": item.last_synced_at.isoformat() if item.last_synced_at else None,
        }
        for item in items
    ]


# =====================================================================
# ACCOUNTING & ERP LEDGER INGESTION API (XERO / QUICKBOOKS ONLINE)
# =====================================================================

@app.get("/api/v1/integrations/accounting/connect/{provider}")
def get_accounting_auth_url(
    provider: str = Path(..., description="Provider name: 'xero' or 'quickbooks'"),
    organization_id: int = Query(..., description="Target organization ID"),
    session: Session = Depends(get_session),
):
    """
    Generates OAuth2 authorization URL for connecting Xero or QuickBooks Online.
    """
    org = session.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization #{organization_id} not found")

    try:
        return accounting_service.get_oauth_authorization_url(
            provider=provider,
            organization_id=organization_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/integrations/accounting/callback/{provider}")
async def handle_accounting_oauth_callback(
    provider: str = Path(..., description="Provider name: 'xero' or 'quickbooks'"),
    code: str = Query(..., description="OAuth2 authorization code"),
    state: str = Query(..., description="OAuth2 state containing organization ID"),
    realmId: Optional[str] = Query(default=None, description="QuickBooks Realm ID"),
    session: Session = Depends(get_session),
):
    """
    OAuth2 callback endpoint that exchanges authorization code for API tokens
    and executes initial invoice/bills sync.
    """
    try:
        res = await accounting_service.handle_oauth_callback(
            session=session,
            provider=provider,
            code=code,
            state=state,
            realm_id=realmId,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Accounting callback error: {str(e)}")


@app.post("/api/v1/integrations/accounting/sync/{organization_id}")
async def sync_accounting_ledger(
    organization_id: int = Path(..., description="Organization ID"),
    provider: str = Query(default="xero", description="Provider name: 'xero' or 'quickbooks'"),
    session: Session = Depends(get_session),
):
    """
    Syncs pending AR customer invoices and AP vendor bills from ERP
    directly into CashPulse's deterministic 13-week forecast engine.
    """
    org = session.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization #{organization_id} not found")

    res = await accounting_service.sync_invoices_from_accounting(
        session=session,
        organization_id=organization_id,
        provider=provider,
    )
    return res


@app.get("/api/v1/integrations/accounting/connections/{organization_id}")
def list_accounting_connections(
    organization_id: int = Path(..., description="Organization ID"),
    session: Session = Depends(get_session),
):
    """Lists all active ERP and accounting connections for an organization."""
    conns = session.exec(
        select(models.AccountingConnection).where(
            models.AccountingConnection.organization_id == organization_id,
            models.AccountingConnection.status == "connected",
        )
    ).all()
    return [
        {
            "id": c.id,
            "provider": c.provider,
            "tenant_id": c.tenant_id,
            "status": c.status,
            "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
        }
        for c in conns
    ]




