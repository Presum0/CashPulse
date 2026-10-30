import {
  ForecastResponse,
  ForecastSummary,
  DailyForecast,
  CopilotAnalysisResponse,
  ActionDraft,
  ActionExecutionResponse,
  CreateOrganizationPayload,
  OrganizationInfo,
  PlaidItemInfo,
  AccountingConnectionInfo,
  PlaidExchangeResponse,
  PlaidSyncResponse,
  AccountingSyncResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createOrganization(
  payload: CreateOrganizationPayload
): Promise<{ organization_id: number; name: string; currency: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/organizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {}
    throw new Error(`Failed to create organization: ${errorDetail}`);
  }

  return res.json();
}

export async function getOrganizations(): Promise<OrganizationInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/organizations`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  } catch (err) {
    console.warn("Unable to fetch organizations from backend:", err);
    return [];
  }
}

export async function getForecast(
  organizationId: number = 2,
  asOfDate?: string
): Promise<ForecastResponse> {
  const url = new URL(`${API_BASE_URL}/api/v1/forecast/${organizationId}`);
  if (asOfDate) {
    url.searchParams.append("as_of_date", asOfDate);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch forecast: ${res.statusText}`);
  }

  const data = await res.json();

  // Normalize summary metrics
  const fWindow = data.forecast_window || {};
  const sMetrics = data.summary_metrics || {};
  const lwm = sMetrics.low_water_mark || {};

  const summary: ForecastSummary = data.summary || {
    as_of_date: fWindow.start_date || new Date().toISOString().split("T")[0],
    horizon_days: fWindow.total_days || 91,
    starting_cash: sMetrics.starting_cash_balance ?? 0,
    ending_cash: sMetrics.ending_cash_balance ?? 0,
    net_burn: sMetrics.net_cash_change ?? 0,
    monthly_burn_rate: sMetrics.estimated_monthly_burn ?? 0,
    min_cash_balance: lwm.amount ?? 0,
    min_cash_date: lwm.date || "",
    max_cash_balance: sMetrics.ending_cash_balance ?? 0,
    max_cash_date: "",
    breach_count: lwm.is_deficit ? 1 : 0,
    has_acute_deficit: lwm.is_deficit ?? false,
    first_deficit_date: lwm.is_deficit ? lwm.date : null,
    runway_days: sMetrics.runway_days ?? null,
    total_expected_inflow: sMetrics.total_projected_inflow ?? 0,
    total_expected_outflow: sMetrics.total_projected_outflow ?? 0,
    policy_floor: sMetrics.policy_floor ?? 50000,
  };

  interface RawDaily {
    closing_balance?: number;
    projected_balance?: number;
    date: string;
    day_index?: number;
    day_offset?: number;
    total_inflow?: number;
    expected_inflow?: number;
    total_outflow?: number;
    expected_outflow?: number;
    breakdown?: Record<string, number>;
  }

  const rawDaily: RawDaily[] = data.daily_forecast || data.daily_projections || [];
  const daily_projections: DailyForecast[] = rawDaily.map((d: RawDaily) => {
    const balance = d.closing_balance ?? d.projected_balance ?? 0;
    const isDeficit = balance < 0;
    return {
      date: d.date,
      day_offset: d.day_index ?? d.day_offset ?? 0,
      projected_balance: balance,
      expected_inflow: d.total_inflow ?? d.expected_inflow ?? 0,
      expected_outflow: d.total_outflow ?? d.expected_outflow ?? 0,
      inflow_sources: d.breakdown?.ar_collections ? ["AR Collections"] : [],
      outflow_sources: d.breakdown
        ? Object.keys(d.breakdown).filter((k) => d.breakdown[k] > 0)
        : [],
      is_weekend: false,
      is_low_water_mark: d.day_index === lwm.day_index,
      is_deficit: isDeficit,
      runway_days_remaining: isDeficit ? 0 : undefined,
    };
  });

  return {
    organization_id: data.organization_id,
    organization_name: data.organization_name,
    currency: data.currency || "USD",
    generated_at: data.generated_at,
    summary,
    daily_projections,
  };
}

export async function runCopilotAnalysis(
  organizationId: number = 2,
  asOfDate?: string
): Promise<CopilotAnalysisResponse> {
  const url = new URL(
    `${API_BASE_URL}/api/v1/copilot/analyze/${organizationId}`
  );
  if (asOfDate) {
    url.searchParams.append("as_of_date", asOfDate);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to run copilot analysis: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    organization_id: data.organization_id,
    as_of_date: data.as_of_date || new Date().toISOString(),
    is_at_risk: data.forecast_snapshot?.is_at_risk ?? false,
    detected_risks: data.detected_risks || [],
    recommended_actions: data.recommended_actions || [],
    reasoning_trace: data.reasoning_trace || [],
    action_drafts: data.action_drafts || [],
  };
}

export async function getActionDrafts(
  organizationId: number = 2,
  status?: string
): Promise<ActionDraft[]> {
  const url = new URL(
    `${API_BASE_URL}/api/v1/copilot/actions/${organizationId}`
  );
  if (status) {
    url.searchParams.append("status", status);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch action drafts: ${res.statusText}`);
  }

  return res.json();
}

export async function executeActionDraft(
  actionId: number,
  decision: "APPROVE" | "REJECT",
  notes?: string
): Promise<ActionExecutionResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/copilot/actions/${actionId}/execute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes: notes || "" }),
    }
  );

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {}
    throw new Error(`Execution failed (${res.status}): ${errorDetail}`);
  }

  return res.json();
}

export async function seedDatabase(seed: number = 42): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}/seed?seed=${seed}`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to seed database: ${res.statusText}`);
  }
  return res.json();
}

// =====================================================================
// PLAID INTEGRATION CLIENT
// =====================================================================

export async function createPlaidLinkToken(
  organizationId: number
): Promise<{ link_token: string; expiration: string; mode: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/plaid/create-link-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: organizationId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create Plaid link token: ${res.statusText}`);
  }
  return res.json();
}

export async function exchangePlaidPublicToken(payload: {
  public_token: string;
  organization_id: number;
  institution_id?: string;
  institution_name?: string;
}): Promise<PlaidExchangeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/plaid/exchange-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to exchange Plaid token: ${res.statusText}`);
  }
  return res.json();
}

export async function syncPlaidBankFeeds(organizationId: number): Promise<PlaidSyncResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/plaid/sync/${organizationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to sync Plaid bank data: ${res.statusText}`);
  }
  return res.json();
}

export async function getPlaidItems(organizationId: number): Promise<PlaidItemInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/plaid/items/${organizationId}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// =====================================================================
// ACCOUNTING (XERO / QUICKBOOKS) INTEGRATION CLIENT
// =====================================================================

export async function getAccountingConnectUrl(
  provider: "xero" | "quickbooks",
  organizationId: number
): Promise<{ provider: string; auth_url: string; mode: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/integrations/accounting/connect/${provider}?organization_id=${organizationId}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to get accounting connect URL: ${res.statusText}`);
  }
  return res.json();
}

export async function syncAccountingLedger(
  organizationId: number,
  provider: "xero" | "quickbooks" = "xero"
): Promise<AccountingSyncResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/integrations/accounting/sync/${organizationId}?provider=${provider}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to sync accounting ledger: ${res.statusText}`);
  }
  return res.json();
}

export async function getAccountingConnections(organizationId: number): Promise<AccountingConnectionInfo[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/integrations/accounting/connections/${organizationId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

