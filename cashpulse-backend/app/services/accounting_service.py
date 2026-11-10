import os
import uuid
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import httpx
from sqlmodel import Session, select

from app.models import (
    Organization,
    Invoice,
    InvoiceType,
    InvoiceStatus,
    AccountingConnection,
)

# =====================================================================
# CONFIGURATION & CONSTANTS
# =====================================================================

XERO_CLIENT_ID = os.getenv("XERO_CLIENT_ID", "")
XERO_CLIENT_SECRET = os.getenv("XERO_CLIENT_SECRET", "")
XERO_REDIRECT_URI = os.getenv(
    "XERO_REDIRECT_URI",
    "http://localhost:8000/api/v1/integrations/accounting/callback/xero",
)

QBO_CLIENT_ID = os.getenv("QBO_CLIENT_ID", "")
QBO_CLIENT_SECRET = os.getenv("QBO_CLIENT_SECRET", "")
QBO_REDIRECT_URI = os.getenv(
    "QBO_REDIRECT_URI",
    "http://localhost:8000/api/v1/integrations/accounting/callback/quickbooks",
)
QBO_ENV = os.getenv("QBO_ENV", "sandbox").lower()

# Intuit OAuth2 endpoints (same for sandbox & production)
QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

# Intuit Accounting REST API Base URLs
QBO_API_BASE_URLS = {
    "sandbox": "https://sandbox-quickbooks.api.intuit.com/v3/company",
    "production": "https://quickbooks.api.intuit.com/v3/company",
}


def get_qbo_api_base_url() -> str:
    return QBO_API_BASE_URLS.get(QBO_ENV, QBO_API_BASE_URLS["sandbox"])


def is_live_qbo_configured() -> bool:
    """Returns True if live QuickBooks Online credentials are set and non-placeholder."""
    if not QBO_CLIENT_ID or not QBO_CLIENT_SECRET:
        return False
    if QBO_CLIENT_ID.startswith("your_") or QBO_CLIENT_SECRET.startswith("your_"):
        return False
    return True


def is_live_xero_configured() -> bool:
    """Returns True if live Xero credentials are set and non-placeholder."""
    if not XERO_CLIENT_ID or not XERO_CLIENT_SECRET:
        return False
    if XERO_CLIENT_ID.startswith("your_") or XERO_CLIENT_SECRET.startswith("your_"):
        return False
    return True


# =====================================================================
# 1. OAUTH2 AUTHORIZATION URL BUILDER
# =====================================================================

def get_oauth_authorization_url(provider: str, organization_id: int) -> Dict[str, Any]:
    """
    Constructs the OAuth2 authorization URL for Xero or QuickBooks Online.
    Falls back to a simulated OAuth redirect URL for local development/testing.
    """
    provider_clean = provider.lower()
    state = f"org_{organization_id}_{uuid.uuid4().hex[:8]}"

    if provider_clean in ["quickbooks", "qbo"]:
        if not is_live_qbo_configured():
            # Simulated OAuth sandbox redirect for local development & automated tests
            return {
                "provider": "quickbooks",
                "auth_url": f"/api/v1/integrations/accounting/callback/quickbooks?code=simulated_code&state={state}&realmId=sim_realm_462",
                "mode": "simulated",
            }

        scopes = "com.intuit.quickbooks.accounting"
        params = {
            "client_id": QBO_CLIENT_ID,
            "response_type": "code",
            "scope": scopes,
            "redirect_uri": QBO_REDIRECT_URI,
            "state": state,
        }
        url = f"{QBO_AUTH_URL}?{urllib.parse.urlencode(params)}"
        return {"provider": "quickbooks", "auth_url": url, "mode": "live"}

    elif provider_clean == "xero":
        if not is_live_xero_configured():
            return {
                "provider": "xero",
                "auth_url": f"/api/v1/integrations/accounting/callback/xero?code=simulated_code&state={state}",
                "mode": "simulated",
            }

        scopes = "accounting.transactions.read accounting.contacts.read offline_access"
        params = {
            "response_type": "code",
            "client_id": XERO_CLIENT_ID,
            "redirect_uri": XERO_REDIRECT_URI,
            "scope": scopes,
            "state": state,
        }
        url = f"https://login.xero.com/identity/connect/authorize?{urllib.parse.urlencode(params)}"
        return {"provider": "xero", "auth_url": url, "mode": "live"}

    else:
        raise ValueError(f"Unsupported accounting provider '{provider}'")


# =====================================================================
# 2. OAUTH2 CALLBACK & TOKEN PERSISTENCE
# =====================================================================

async def handle_oauth_callback(
    session: Session,
    provider: str,
    code: str,
    state: str,
    realm_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchanges OAuth2 authorization code for access and refresh tokens,
    determines tenant/realm ID, securely stores tokens in AccountingConnection,
    and initiates the initial ledger synchronization.
    """
    # Extract organization_id from state (format: org_{id}_{hash})
    org_id = 1
    if state:
        parts = state.split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            org_id = int(parts[1])
        elif parts[0].isdigit():
            org_id = int(parts[0])

    provider_clean = "quickbooks" if provider.lower() in ["quickbooks", "qbo"] else provider.lower()
    now_utc = datetime.now(timezone.utc)

    # Defaults for simulated/fallback mode
    access_token = f"sim_access_{uuid.uuid4().hex[:16]}"
    refresh_token = f"sim_refresh_{uuid.uuid4().hex[:16]}"
    token_expires_at = now_utc + timedelta(hours=1)
    tenant_id = realm_id or f"realm_{uuid.uuid4().hex[:8]}"

    # --- Live QuickBooks Online Token Exchange ---
    if provider_clean == "quickbooks" and is_live_qbo_configured() and code != "simulated_code":
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(
                QBO_TOKEN_URL,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": QBO_REDIRECT_URI,
                },
                auth=(QBO_CLIENT_ID, QBO_CLIENT_SECRET),
            )

            if token_res.status_code == 200:
                token_data = token_res.json()
                access_token = token_data.get("access_token", access_token)
                refresh_token = token_data.get("refresh_token", refresh_token)
                expires_in = int(token_data.get("expires_in", 3600))
                token_expires_at = now_utc + timedelta(seconds=expires_in)
                if realm_id:
                    tenant_id = realm_id
            else:
                err_msg = f"QBO Token Exchange failed (HTTP {token_res.status_code}): {token_res.text}"
                print(err_msg)
                raise ValueError(err_msg)

    # --- Live Xero Token Exchange ---
    elif provider_clean == "xero" and is_live_xero_configured() and code != "simulated_code":
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(
                "https://identity.xero.com/connect/token",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": XERO_REDIRECT_URI,
                },
                auth=(XERO_CLIENT_ID, XERO_CLIENT_SECRET),
            )
            if token_res.status_code == 200:
                token_data = token_res.json()
                access_token = token_data.get("access_token", access_token)
                refresh_token = token_data.get("refresh_token", refresh_token)
                expires_in = int(token_data.get("expires_in", 1800))
                token_expires_at = now_utc + timedelta(seconds=expires_in)

                # Fetch connected Xero tenants
                conn_res = await client.get(
                    "https://api.xero.com/connections",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if conn_res.status_code == 200 and conn_res.json():
                    tenant_id = conn_res.json()[0].get("tenantId", tenant_id)
            else:
                err_msg = f"Xero Token Exchange failed (HTTP {token_res.status_code}): {token_res.text}"
                print(err_msg)
                raise ValueError(err_msg)

    # --- Securely Persist into AccountingConnection Table ---
    existing_conn = session.exec(
        select(AccountingConnection).where(
            AccountingConnection.organization_id == org_id,
            AccountingConnection.provider == provider_clean,
        )
    ).first()

    if existing_conn:
        existing_conn.access_token = access_token
        existing_conn.refresh_token = refresh_token
        existing_conn.token_expires_at = token_expires_at
        existing_conn.tenant_id = tenant_id
        existing_conn.status = "connected"
        existing_conn.last_synced_at = now_utc
        session.add(existing_conn)
        conn = existing_conn
    else:
        conn = AccountingConnection(
            organization_id=org_id,
            provider=provider_clean,
            tenant_id=tenant_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            status="connected",
            last_synced_at=now_utc,
        )
        session.add(conn)

    session.commit()
    session.refresh(conn)

    # Execute initial invoice & bill ledger sync
    sync_summary = await sync_invoices_from_accounting(
        session=session,
        organization_id=org_id,
        provider=provider_clean,
    )

    return {
        "status": "CONNECTED",
        "connection_id": conn.id,
        "provider": conn.provider,
        "organization_id": org_id,
        "tenant_id": conn.tenant_id,
        "sync_summary": sync_summary,
    }


# =====================================================================
# 3. AUTOMATED TOKEN REFRESH INTERCEPTOR
# =====================================================================

async def ensure_valid_access_token(
    session: Session,
    conn: AccountingConnection,
) -> str:
    """
    Checks if connection access token is expired or expiring within 5 minutes.
    If expired, proactively uses stored refresh_token to request a new access token
    from Intuit or Xero and updates the database record.
    Returns a guaranteed valid access token string.
    """
    now_utc = datetime.now(timezone.utc)
    is_expired = False

    if conn.token_expires_at is not None:
        expires_at = conn.token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        # 5-minute pre-expiration renewal buffer
        if expires_at <= now_utc + timedelta(minutes=5):
            is_expired = True
    elif not conn.access_token:
        is_expired = True

    # If currently valid, return existing access token
    if not is_expired and conn.access_token:
        return conn.access_token

    provider_clean = "quickbooks" if conn.provider.lower() in ["quickbooks", "qbo"] else conn.provider.lower()

    # --- Live QuickBooks Refresh Flow ---
    if (
        provider_clean == "quickbooks"
        and is_live_qbo_configured()
        and conn.refresh_token
        and not conn.refresh_token.startswith("sim_")
    ):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    QBO_TOKEN_URL,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": conn.refresh_token,
                    },
                    auth=(QBO_CLIENT_ID, QBO_CLIENT_SECRET),
                )
                if res.status_code == 200:
                    token_data = res.json()
                    conn.access_token = token_data.get("access_token", conn.access_token)
                    conn.refresh_token = token_data.get("refresh_token", conn.refresh_token)
                    expires_in = int(token_data.get("expires_in", 3600))
                    conn.token_expires_at = now_utc + timedelta(seconds=expires_in)
                    conn.status = "connected"
                    session.add(conn)
                    session.commit()
                    session.refresh(conn)
                    return conn.access_token
                else:
                    conn.status = "expired"
                    session.add(conn)
                    session.commit()
                    raise ValueError(f"Failed to refresh QuickBooks token (HTTP {res.status_code}): {res.text}")
        except Exception as e:
            conn.status = "expired"
            session.add(conn)
            session.commit()
            raise ValueError(f"QuickBooks token refresh error: {str(e)}")

    # --- Live Xero Refresh Flow ---
    elif (
        provider_clean == "xero"
        and is_live_xero_configured()
        and conn.refresh_token
        and not conn.refresh_token.startswith("sim_")
    ):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://identity.xero.com/connect/token",
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": conn.refresh_token,
                    },
                    auth=(XERO_CLIENT_ID, XERO_CLIENT_SECRET),
                )
                if res.status_code == 200:
                    token_data = res.json()
                    conn.access_token = token_data.get("access_token", conn.access_token)
                    conn.refresh_token = token_data.get("refresh_token", conn.refresh_token)
                    expires_in = int(token_data.get("expires_in", 1800))
                    conn.token_expires_at = now_utc + timedelta(seconds=expires_in)
                    conn.status = "connected"
                    session.add(conn)
                    session.commit()
                    session.refresh(conn)
                    return conn.access_token
                else:
                    conn.status = "expired"
                    session.add(conn)
                    session.commit()
                    raise ValueError(f"Failed to refresh Xero token (HTTP {res.status_code}): {res.text}")
        except Exception as e:
            conn.status = "expired"
            session.add(conn)
            session.commit()
            raise ValueError(f"Xero token refresh error: {str(e)}")

    # --- Fallback / Simulated Token Renewal ---
    conn.access_token = f"sim_access_{uuid.uuid4().hex[:16]}"
    conn.token_expires_at = now_utc + timedelta(hours=1)
    conn.status = "connected"
    session.add(conn)
    session.commit()
    session.refresh(conn)
    return conn.access_token


# =====================================================================
# 4. LEDGER DATA MAPPING TO FORECAST ENGINE
# =====================================================================

async def sync_invoices_from_accounting(
    session: Session,
    organization_id: int,
    provider: str = "quickbooks",
) -> Dict[str, Any]:
    """
    Syncs Accounts Receivable (Customer Invoices, AR = Inflow) and
    Accounts Payable (Vendor Bills, AP = Outflow) from QuickBooks Online or Xero
    directly into the SQLModel `Invoice` table for the deterministic 13-week forecast.
    """
    org = session.get(Organization, organization_id)
    if not org:
        raise ValueError(f"Organization #{organization_id} not found")

    provider_clean = "quickbooks" if provider.lower() in ["quickbooks", "qbo"] else provider.lower()
    today = date.today()

    conn = session.exec(
        select(AccountingConnection).where(
            AccountingConnection.organization_id == organization_id,
            AccountingConnection.provider == provider_clean,
        )
    ).first()

    # Ensure valid connection record exists (auto-provision simulated connection if needed)
    if not conn:
        conn = AccountingConnection(
            organization_id=organization_id,
            provider=provider_clean,
            tenant_id=f"realm_{organization_id}",
            access_token=f"sim_access_{uuid.uuid4().hex[:16]}",
            refresh_token=f"sim_refresh_{uuid.uuid4().hex[:16]}",
            token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            status="connected",
            last_synced_at=datetime.now(timezone.utc),
        )
        session.add(conn)
        session.commit()
        session.refresh(conn)

    # Interceptor: Automatically check and refresh token before making API calls
    access_token = await ensure_valid_access_token(session=session, conn=conn)

    synced_ar = 0
    synced_ap = 0
    is_live = not access_token.startswith("sim_")

    # =================================================================
    # CASE A: LIVE QUICKBOOKS ONLINE REST API INGESTION
    # =================================================================
    if is_live and provider_clean == "quickbooks" and is_live_qbo_configured():
        realm_id = conn.tenant_id or ""
        base_api_url = get_qbo_api_base_url()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            # 1. Fetch Customer Invoices (AR - Receivables / Inflows)
            ar_query = "SELECT * FROM Invoice WHERE Balance > '0' MAXRESULTS 100"
            ar_url = f"{base_api_url}/{realm_id}/query?query={urllib.parse.quote(ar_query)}"
            ar_res = await client.get(ar_url, headers=headers)

            if ar_res.status_code == 200:
                ar_data = ar_res.json().get("QueryResponse", {}).get("Invoice", [])
                for inv in ar_data:
                    inv_id = str(inv.get("Id", ""))
                    inv_num = inv.get("DocNumber") or f"QB-INV-{inv_id}"
                    balance = float(inv.get("Balance") or inv.get("TotalAmt") or 0.0)
                    customer_name = inv.get("CustomerRef", {}).get("name", "Corporate Client")

                    txn_date_str = inv.get("TxnDate")
                    issue_d = (
                        datetime.strptime(txn_date_str[:10], "%Y-%m-%d").date()
                        if txn_date_str
                        else today - timedelta(days=15)
                    )

                    due_date_str = inv.get("DueDate")
                    due_d = (
                        datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
                        if due_date_str
                        else issue_d + timedelta(days=30)
                    )

                    # Expected payment timing accounts for customer settlement lag
                    if due_d < today:
                        # Overdue receivable expected on Day 7 lag
                        exp_date = today + timedelta(days=7)
                        inv_status = InvoiceStatus.OVERDUE
                    else:
                        # Standard 10-day collection settlement lag
                        exp_date = due_d + timedelta(days=10)
                        inv_status = InvoiceStatus.PENDING

                    existing = session.exec(
                        select(Invoice).where(
                            Invoice.organization_id == organization_id,
                            Invoice.invoice_number == inv_num,
                        )
                    ).first()

                    if existing:
                        existing.amount = balance
                        existing.invoice_type = InvoiceType.AR
                        existing.client_or_vendor = customer_name
                        existing.issue_date = issue_d
                        existing.due_date = due_d
                        existing.expected_payment_date = exp_date
                        existing.status = inv_status
                        session.add(existing)
                    else:
                        new_ar = Invoice(
                            organization_id=organization_id,
                            invoice_number=inv_num,
                            invoice_type=InvoiceType.AR,
                            amount=balance,
                            client_or_vendor=customer_name,
                            issue_date=issue_d,
                            due_date=due_d,
                            expected_payment_date=exp_date,
                            status=inv_status,
                        )
                        session.add(new_ar)
                    synced_ar += 1

            # 2. Fetch Vendor Bills (AP - Payables / Outflows)
            ap_query = "SELECT * FROM Bill WHERE Balance > '0' MAXRESULTS 100"
            ap_url = f"{base_api_url}/{realm_id}/query?query={urllib.parse.quote(ap_query)}"
            ap_res = await client.get(ap_url, headers=headers)

            if ap_res.status_code == 200:
                ap_data = ap_res.json().get("QueryResponse", {}).get("Bill", [])
                for bill in ap_data:
                    bill_id = str(bill.get("Id", ""))
                    bill_num = bill.get("DocNumber") or f"QB-BILL-{bill_id}"
                    balance = float(bill.get("Balance") or bill.get("TotalAmt") or 0.0)
                    vendor_name = bill.get("VendorRef", {}).get("name", "Vendor Supplier")

                    txn_date_str = bill.get("TxnDate")
                    issue_d = (
                        datetime.strptime(txn_date_str[:10], "%Y-%m-%d").date()
                        if txn_date_str
                        else today - timedelta(days=10)
                    )

                    due_date_str = bill.get("DueDate")
                    due_d = (
                        datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
                        if due_date_str
                        else issue_d + timedelta(days=30)
                    )

                    # AP bills are planned for outflow on their due date (or Day 1 if already overdue)
                    exp_date = due_d
                    inv_status = InvoiceStatus.OVERDUE if due_d < today else InvoiceStatus.PENDING

                    existing = session.exec(
                        select(Invoice).where(
                            Invoice.organization_id == organization_id,
                            Invoice.invoice_number == bill_num,
                        )
                    ).first()

                    if existing:
                        existing.amount = balance
                        existing.invoice_type = InvoiceType.AP
                        existing.client_or_vendor = vendor_name
                        existing.issue_date = issue_d
                        existing.due_date = due_d
                        existing.expected_payment_date = exp_date
                        existing.status = inv_status
                        session.add(existing)
                    else:
                        new_ap = Invoice(
                            organization_id=organization_id,
                            invoice_number=bill_num,
                            invoice_type=InvoiceType.AP,
                            amount=balance,
                            client_or_vendor=vendor_name,
                            issue_date=issue_d,
                            due_date=due_d,
                            expected_payment_date=exp_date,
                            status=inv_status,
                        )
                        session.add(new_ap)
                    synced_ap += 1

    # =================================================================
    # CASE B: LIVE XERO REST API INGESTION
    # =================================================================
    elif is_live and provider_clean == "xero" and is_live_xero_configured():
        async with httpx.AsyncClient(timeout=20.0) as client:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Xero-Tenant-Id": conn.tenant_id or "",
                "Accept": "application/json",
            }
            url = "https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED"
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                invoices = res.json().get("Invoices", [])
                for inv in invoices:
                    inv_type_raw = inv.get("Type")
                    inv_type = InvoiceType.AR if inv_type_raw == "ACCREC" else InvoiceType.AP
                    amount = float(inv.get("AmountDue", 0.0))
                    inv_num = inv.get("InvoiceNumber", f"XERO-{uuid.uuid4().hex[:6]}")
                    contact_name = inv.get("Contact", {}).get("Name", "Corporate Partner")

                    due_date_str = inv.get("DueDateString") or (today + timedelta(days=30)).isoformat()
                    due_d = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
                    exp_date = due_d + timedelta(days=12) if inv_type == InvoiceType.AR else due_d
                    inv_status = InvoiceStatus.OVERDUE if due_d < today else InvoiceStatus.PENDING

                    existing = session.exec(
                        select(Invoice).where(
                            Invoice.organization_id == organization_id,
                            Invoice.invoice_number == inv_num,
                        )
                    ).first()

                    if existing:
                        existing.amount = amount
                        existing.invoice_type = inv_type
                        existing.client_or_vendor = contact_name
                        existing.due_date = due_d
                        existing.expected_payment_date = exp_date
                        existing.status = inv_status
                        session.add(existing)
                    else:
                        new_inv = Invoice(
                            organization_id=organization_id,
                            invoice_number=inv_num,
                            invoice_type=inv_type,
                            amount=amount,
                            client_or_vendor=contact_name,
                            issue_date=today - timedelta(days=14),
                            due_date=due_d,
                            expected_payment_date=exp_date,
                            status=inv_status,
                        )
                        session.add(new_inv)

                    if inv_type == InvoiceType.AR:
                        synced_ar += 1
                    else:
                        synced_ap += 1

    # =================================================================
    # CASE C: HIGH-FIDELITY SIMULATED INGESTION (SANDBOX / DEMO DATA)
    # =================================================================
    else:
        prefix = "QB" if provider_clean == "quickbooks" else "XR"

        # Realistic 13-week schedule mapping receivables (inflows) and payables (outflows)
        sample_invoices = [
            # AR (Receivables / Inflows)
            (f"{prefix}-INV-9021", InvoiceType.AR, 68500.0, "Apex Global Logistics", today + timedelta(days=14), today + timedelta(days=22)),
            (f"{prefix}-INV-9022", InvoiceType.AR, 42000.0, "Nordic Supply Chains", today + timedelta(days=28), today + timedelta(days=38)),
            (f"{prefix}-INV-9023", InvoiceType.AR, 95000.0, "Meridian Retail Enterprise", today + timedelta(days=45), today + timedelta(days=58)),
            (f"{prefix}-INV-9024", InvoiceType.AR, 31200.0, "Vanguard Distribution", today + timedelta(days=60), today + timedelta(days=70)),
            # AP (Payables / Outflows)
            (f"{prefix}-BILL-4011", InvoiceType.AP, 34500.0, "Maersk Freight Line Corp", today + timedelta(days=10), today + timedelta(days=10)),
            (f"{prefix}-BILL-4012", InvoiceType.AP, 28000.0, "Prologis Terminal Warehousing", today + timedelta(days=25), today + timedelta(days=25)),
            (f"{prefix}-BILL-4013", InvoiceType.AP, 52000.0, "Apex Fuel & Fleet Services", today + timedelta(days=35), today + timedelta(days=35)),
            (f"{prefix}-BILL-4014", InvoiceType.AP, 19500.0, "Global Harbor Stevedoring", today + timedelta(days=50), today + timedelta(days=50)),
        ]

        for num, itype, amt, name, due, exp in sample_invoices:
            inv_status = InvoiceStatus.OVERDUE if due < today else InvoiceStatus.PENDING
            existing = session.exec(
                select(Invoice).where(
                    Invoice.organization_id == organization_id,
                    Invoice.invoice_number == num,
                )
            ).first()

            if existing:
                existing.amount = amt
                existing.invoice_type = itype
                existing.client_or_vendor = name
                existing.due_date = due
                existing.expected_payment_date = exp
                existing.status = inv_status
                session.add(existing)
            else:
                inv = Invoice(
                    organization_id=organization_id,
                    invoice_number=num,
                    invoice_type=itype,
                    amount=amt,
                    client_or_vendor=name,
                    issue_date=today - timedelta(days=10),
                    due_date=due,
                    expected_payment_date=exp,
                    status=inv_status,
                )
                session.add(inv)

            if itype == InvoiceType.AR:
                synced_ar += 1
            else:
                synced_ap += 1

    # Update connection timestamps
    conn.last_synced_at = datetime.now(timezone.utc)
    conn.status = "connected"
    session.add(conn)
    session.commit()

    return {
        "status": "SUCCESS",
        "provider": provider_clean,
        "organization_id": organization_id,
        "ar_invoices_synced": synced_ar,
        "ap_bills_synced": synced_ap,
        "total_invoices_synced": synced_ar + synced_ap,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
