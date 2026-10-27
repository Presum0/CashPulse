from contextlib import asynccontextmanager
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import FastAPI, Depends, Query, HTTPException, Path
from sqlmodel import Session, select
from app.database import create_db_and_tables, get_session
from app import models  # Ensures SQLModel metadata is populated before create_db_and_tables()
from app.services.generator import seed_all
from app.services.forecast import generate_13_week_forecast
from app.agent.graph import run_copilot_workflow


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
    req: ActionExecutionRequest = ActionExecutionRequest(),
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
            detail=f"ActionDraft with ID {action_id} not found",
        )

    decision = req.decision.upper()
    now_utc = datetime.now(timezone.utc)

    if decision == "APPROVE":
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



