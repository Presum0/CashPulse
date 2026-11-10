"""
Audit Logging Service for CashPulse.
Provides immutable audit trail persistence and compliance retrieval for tenant actions.
"""
from datetime import datetime, timezone, timedelta
import json
import uuid
from typing import Optional, Any, List
from sqlmodel import Session, select
from app import models


def log_audit_event(
    session: Session,
    organization_id: int,
    action_type: str,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None,
    payload_summary: Optional[Any] = None,
) -> models.AuditLog:
    """
    Persists an immutable compliance audit record tied to a tenant organization.
    """
    summary_str = ""
    if isinstance(payload_summary, (dict, list)):
        try:
            summary_str = json.dumps(payload_summary)
        except Exception:
            summary_str = str(payload_summary)
    elif payload_summary is not None:
        summary_str = str(payload_summary)

    log_entry = models.AuditLog(
        id=str(uuid.uuid4()),
        organization_id=organization_id,
        user_email=user_email or "cfo@doyle.com",
        user_id=user_id or "user_clerk_cfo",
        action_type=action_type,
        payload_summary=summary_str,
        timestamp=datetime.now(timezone.utc),
    )
    session.add(log_entry)
    session.commit()
    session.refresh(log_entry)
    return log_entry


def get_audit_logs(
    session: Session,
    organization_id: int,
    limit: int = 50,
) -> List[models.AuditLog]:
    """
    Fetches immutable audit logs scoped strictly to the target organization.
    If no audit logs exist yet for this tenant, seeds standard baseline events.
    """
    statement = (
        select(models.AuditLog)
        .where(models.AuditLog.organization_id == organization_id)
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
    )
    results = session.exec(statement).all()

    if not results:
        seed_baseline_audit_logs(session, organization_id)
        results = session.exec(statement).all()

    return results


def seed_baseline_audit_logs(session: Session, organization_id: int) -> None:
    """
    Seeds initial compliance audit events for demonstration and onboarding lineage.
    """
    now = datetime.now(timezone.utc)
    baseline_events = [
        {
            "offset_days": 14,
            "action": "TENANT_PROVISIONED",
            "user": "sysadmin@cashpulse.internal",
            "summary": {"event": "Enterprise tenant registered", "initial_burn": 74300, "currency": "USD"},
        },
        {
            "offset_days": 10,
            "action": "SYNC_PLAID",
            "user": "treasury@doyle.com",
            "summary": {"institution": "Silicon Valley Bank (SVB)", "status": "CONNECTED", "accounts": 2},
        },
        {
            "offset_days": 7,
            "action": "SYNC_QUICKBOOKS",
            "user": "cfo@doyle.com",
            "summary": {"invoices_synced": 22, "ar_count": 14, "ap_count": 8, "status": "SUCCESS"},
        },
        {
            "offset_days": 4,
            "action": "UPDATE_POLICY_FLOOR",
            "user": "cfo@doyle.com",
            "summary": {"previous_floor": 100000.0, "new_floor": 120000.0, "rationale": "Q1 working capital risk"},
        },
        {
            "offset_days": 2,
            "action": "COPILOT_EVALUATION",
            "user": "ai-copilot@cashpulse.internal",
            "summary": {"detected_risks": 2, "shortfall_amount": 38600.0, "low_water_mark": "2026-03-28"},
        },
        {
            "offset_days": 1,
            "action": "APPROVE_ACTION_DRAFT",
            "user": "cfo@doyle.com",
            "summary": {
                "action_type": "EXTEND_AP_TERMS",
                "title": "Vendor AP Terms Extension (+30d)",
                "impact": 54200.0,
                "notes": "Approved by CFO to protect cash runway across Week 04."
            },
        },
    ]

    for ev in baseline_events:
        log = models.AuditLog(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            user_email=ev["user"],
            user_id="user_admin",
            action_type=ev["action"],
            payload_summary=json.dumps(ev["summary"]),
            timestamp=now - timedelta(days=ev["offset_days"]),
        )
        session.add(log)

    session.commit()
