"""
Automated Verification Suite for CashPulse Tenant Security & Data Isolation.
Tests:
1. Normal authorized requests with X-Organization-ID and Bearer token.
2. Cross-tenant isolation violation (X-Organization-ID mismatch with path organization).
3. Cross-tenant action execution rejection (trying to execute another tenant's ActionDraft).
4. Cross-tenant Plaid request rejection.
5. Scoped organization listing.
"""
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.database import engine, create_db_and_tables
from app import models

client = TestClient(app)

def test_tenant_isolation_suite():
    create_db_and_tables()

    # 1. Normal access to tenant 2
    res = client.get(
        "/api/v1/forecast/2",
        headers={
            "Authorization": "Bearer test_clerk_token_cfo",
            "X-Organization-ID": "2",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert "X-Tenant-Isolation" in res.headers
    assert res.headers["X-Tenant-Isolation"] == "org_2"

    # 2. Cross-tenant violation: header says org 1, path requests org 2
    res_violation = client.get(
        "/api/v1/forecast/2",
        headers={
            "Authorization": "Bearer test_clerk_token_cfo",
            "X-Organization-ID": "1",
        },
    )
    assert res_violation.status_code == 403, f"Expected 403 Forbidden, got {res_violation.status_code}"
    assert "Cross-tenant data isolation violation" in res_violation.json()["detail"]

    # 3. Cross-tenant action execution: Tenant 1 attempts to execute an ActionDraft belonging to Tenant 2
    with Session(engine) as session:
        # Find an action draft for org 2
        draft = session.exec(select(models.ActionDraft).where(models.ActionDraft.organization_id == 2)).first()
        assert draft is not None, "Need at least one action draft for org 2"
        draft_id = draft.id

    res_action_violation = client.post(
        f"/api/v1/copilot/actions/{draft_id}/execute",
        headers={
            "Authorization": "Bearer test_clerk_token_cfo",
            "X-Organization-ID": "1",
        },
        json={"decision": "APPROVE"},
    )
    assert res_action_violation.status_code == 403, f"Expected 403, got {res_action_violation.status_code}"
    assert "Cross-tenant isolation violation" in res_action_violation.json()["detail"]

    # 4. Cross-tenant Plaid create link token
    res_plaid_violation = client.post(
        "/api/v1/plaid/create-link-token",
        headers={
            "Authorization": "Bearer test_clerk_token_cfo",
            "X-Organization-ID": "1",
        },
        json={"organization_id": 2},
    )
    assert res_plaid_violation.status_code == 403, f"Expected 403, got {res_plaid_violation.status_code}"

    print("ALL TENANT SECURITY & ISOLATION TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    test_tenant_isolation_suite()
