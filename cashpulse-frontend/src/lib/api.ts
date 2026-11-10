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
  AuditLogEntry,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Resolves the active tenant organization ID from argument, URL search params, or storage.
 */
export function getActiveOrganizationId(overrideId?: number | string): number {
  if (overrideId !== undefined && overrideId !== null && !isNaN(Number(overrideId))) {
    return Number(overrideId);
  }
  if (typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrg = urlParams.get("orgId");
      if (urlOrg && !isNaN(Number(urlOrg))) {
        return Number(urlOrg);
      }
      const user = localStorage.getItem("cashpulse_user");
      if (user) {
        const parsed = JSON.parse(user);
        if (parsed.organizationId) return Number(parsed.organizationId);
      }
      const onboarding = localStorage.getItem("cashpulse_onboarding_org");
      if (onboarding) {
        const parsed = JSON.parse(onboarding);
        if (parsed.organizationId) return Number(parsed.organizationId);
      }
    } catch {
      // Fallback below
    }
  }
  return 2;
}

/**
 * Retrieves the institutional auth token from Clerk session (window.Clerk.session.getToken()),
 * falling back to stored demo session tokens.
 */
export async function getInstitutionalToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      // Dynamic Clerk browser window object inspection
      const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
      if (clerk?.session?.getToken) {
        const token = await clerk.session.getToken();
        if (token) return token;
      }
    } catch (err) {
      console.warn("Could not retrieve Clerk session token:", err);
    }

    try {
      const user = localStorage.getItem("cashpulse_user");
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.token || `demo_token_${parsed.role || "CFO"}`;
      }
    } catch {
      // Fallback
    }
  }
  return null;
}

/**
 * Institutional secure fetch wrapper that dynamically attaches:
 * 1. Authorization: Bearer <clerk_token>
 * 2. X-Organization-ID: <active_tenant_org_id>
 */
export async function secureFetch(
  url: string | URL,
  init?: RequestInit,
  organizationId?: number | string
): Promise<Response> {
  const orgId = getActiveOrganizationId(organizationId);
  const token = await getInstitutionalToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Organization-ID": String(orgId),
    ...(init?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url.toString(), {
    ...init,
    headers,
  });
}

export function normalizeActionDraft(d: Record<string, unknown>): ActionDraft {
  const actionType = String(d.action_type || "AR_FACTORING");
  const isExtend = actionType === "EXTEND_AP_TERMS";
  const isCredit = actionType === "CREDIT_LINE" || actionType === "CREDIT_LINE_DRAW";
  const isTreasury = actionType === "TREASURY_OPTIMIZATION";
  const isEarly = actionType === "EARLY_PAYMENT_DISCOUNT";

  const rawImpact = Number(d.cash_impact ?? d.estimated_impact ?? 0);
  const rawContent = String(d.body || d.draft_content || d.description || "");

  let defaultPriority = "P1";
  if (isCredit) defaultPriority = "P2";
  else if (isTreasury) defaultPriority = "P3";

  let defaultDays = 2;
  if (isExtend) defaultDays = 4;
  else if (isCredit) defaultDays = 7;
  else if (isTreasury) defaultDays = 1;
  else if (isEarly) defaultDays = 5;

  return {
    id: Number(d.id ?? Math.floor(Math.random() * 1000) + 1),
    organization_id: Number(d.organization_id ?? 2),
    action_type: actionType,
    recommendation_id: d.recommendation_id ? String(d.recommendation_id) : null,
    title: String(d.title || "Remediation Action Lever"),
    description: String(d.description || ""),
    recipient: d.recipient ? String(d.recipient) : (isCredit ? "Commercial Banking Credit Desk" : isExtend ? "Key Suppliers & AP Desk" : "Accounts Payable Contact"),
    recipient_email: d.recipient_email ? String(d.recipient_email) : (isCredit ? "credit-desk@bank.com" : isExtend ? "payables@vendor.com" : "billing@counterparty.com"),
    subject: String(d.subject || "Working Capital Notice & Term Adjustment"),
    body: rawContent,
    draft_content: rawContent,
    cash_impact: rawImpact,
    estimated_impact: rawImpact,
    time_to_impact_days: typeof d.time_to_impact_days === "number" ? d.time_to_impact_days : defaultDays,
    priority: String(d.priority || defaultPriority),
    approval_required: Boolean(d.approval_required ?? true),
    status: (String(d.status || "PENDING").toUpperCase()) as ActionDraft["status"],
    created_at: String(d.created_at || new Date().toISOString()),
    executed_at: d.executed_at ? String(d.executed_at) : null,
  };
}

export function getFallbackForecast(organizationId: number = 2): ForecastResponse {
  const isHealthy = organizationId === 1;
  const orgName = isHealthy ? "Rodriguez Technologies" : "Doyle Ltd Logistics";
  const currency = "USD";
  const startingCash = isHealthy ? 125000 : 482400;
  const policyFloor = isHealthy ? 25000 : 120000;
  const monthlyBurn = isHealthy ? 35000 : 74300;
  const minCash = isHealthy ? 27871 : -38600;
  const minDate = isHealthy ? "2026-03-18" : "2026-03-28";
  const hasDeficit = !isHealthy;
  const firstDeficitDate = hasDeficit ? "2026-03-23" : null;
  const runwayDays = hasDeficit ? 37 : null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const daily_projections: DailyForecast[] = [];
  let currentBal = startingCash;

  for (let i = 0; i <= 91; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = d.toISOString().split("T")[0];

    if (i > 0) {
      if (hasDeficit) {
        const drift = i <= 50 ? (startingCash - minCash) / 50 : -((currentBal - minCash) / 40);
        currentBal = Math.round(currentBal - drift + Math.sin(i) * 3500);
      } else {
        currentBal = Math.round(currentBal + Math.sin(i) * 2000 - monthlyBurn / 30);
      }
    }

    const isDeficit = currentBal < 0;
    daily_projections.push({
      date: dateStr,
      day_offset: i,
      projected_balance: currentBal,
      expected_inflow: i % 7 === 0 ? 32000 : 0,
      expected_outflow: i % 14 === 0 ? 41000 : 950,
      inflow_sources: i % 7 === 0 ? ["AR Collections"] : [],
      outflow_sources: i % 14 === 0 ? ["Payroll", "OPEX"] : [],
      is_weekend: d.getDay() === 0 || d.getDay() === 6,
      is_low_water_mark: dateStr === minDate,
      is_deficit: isDeficit,
      runway_days_remaining: isDeficit ? 0 : undefined,
    });
  }

  return {
    organization_id: organizationId,
    organization_name: orgName,
    currency,
    generated_at: new Date().toISOString(),
    summary: {
      as_of_date: todayStr,
      horizon_days: 91,
      starting_cash: startingCash,
      ending_cash: isHealthy ? 142000 : -18900,
      net_burn: isHealthy ? -17000 : 501300,
      monthly_burn_rate: monthlyBurn,
      min_cash_balance: minCash,
      min_cash_date: minDate,
      max_cash_balance: startingCash,
      max_cash_date: todayStr,
      breach_count: hasDeficit ? 1 : 0,
      has_acute_deficit: hasDeficit,
      first_deficit_date: firstDeficitDate,
      runway_days: runwayDays,
      total_expected_inflow: isHealthy ? 450000 : 720000,
      total_expected_outflow: isHealthy ? 433000 : 1221300,
      policy_floor: policyFloor,
    },
    daily_projections,
  };
}

export function getFallbackActionDrafts(organizationId: number = 2): ActionDraft[] {
  if (organizationId === 1) {
    return [
      normalizeActionDraft({
        id: 101,
        organization_id: 1,
        action_type: "TREASURY_OPTIMIZATION",
        priority: "P2",
        title: "Draft Sweep Order: Automated Overnight Treasury Sweep",
        recipient: "Commercial Banking Treasury Desk",
        recipient_email: "treasury@barclayscorp.com",
        subject: "Authorization for Automated Overnight Liquidity Sweep - Rodriguez Technologies",
        draft_content:
          "To: Corporate Treasury Operations Desk\nPlease activate automated daily target-balance sweeps into our overnight yield reserve account for all balances exceeding $100,000. Projected quarterly yield enhancement is $4,332.58.",
        estimated_impact: 4332.58,
        time_to_impact_days: 1,
        status: "PENDING",
      }),
      normalizeActionDraft({
        id: 102,
        organization_id: 1,
        action_type: "EARLY_PAYMENT_DISCOUNT",
        priority: "P1",
        title: "Draft Vendor Proposal: 2/10 Net 30 Prompt Payment Discount",
        recipient: "Key Supplier Disbursements & AP Departments",
        recipient_email: "disbursements@suppliers.com",
        subject: "Prompt Payment Discount Option (2/10 Net 30) - Rodriguez Technologies",
        draft_content:
          "Dear Supplier Partner,\nRodriguez Technologies is offering accelerated settlement on all upcoming vendor invoices. Under our dynamic discounting framework, payments scheduled for Net 30 can be released within 10 days for a 2.0% prompt discount.",
        estimated_impact: 4532.81,
        time_to_impact_days: 5,
        status: "PENDING",
      }),
    ];
  }

  return [
    normalizeActionDraft({
      id: 201,
      organization_id: 2,
      action_type: "INVOICE_FACTORING",
      priority: "P1",
      title: "Release collection notice & factoring on Invoice #4417",
      recipient: "Alexandra Whitmore (Northgate Freight)",
      recipient_email: "ap@northgatefreight.com",
      subject: "Invoice 4417 — $18,400 open, payment date needed this week",
      draft_content:
        "Dear Alexandra,\n\nInvoice 4417 for $18,400 fell due on 3 February and is currently open. Two further invoices — 4432 and 4448 — are now past terms, bringing the total account balance to $46,800.\n\nPlease confirm when we can expect settlement on these items.",
      estimated_impact: 46800,
      time_to_impact_days: 2,
      status: "PENDING",
    }),
    normalizeActionDraft({
      id: 202,
      organization_id: 2,
      action_type: "EXTEND_AP_TERMS",
      priority: "P1",
      title: "Extend Net-30 to Net-60 across four open vendor POs",
      recipient: "Apex Logistics Suppliers",
      recipient_email: "billing@apexlogistics.com",
      subject: "Request to defer payment terms to Net-60 for PO #8821-8824",
      draft_content:
        "Dear Vendor Accounting,\n\nTo align our working capital schedule with customer settlement cycles, we request a 30-day extension on upcoming bills, deferring $31,200 of payables into mid-April.",
      estimated_impact: 31200,
      time_to_impact_days: 4,
      status: "PENDING",
    }),
    normalizeActionDraft({
      id: 203,
      organization_id: 2,
      action_type: "CREDIT_LINE",
      priority: "P2",
      title: "Draw down $75,000 First Meridian standby bridge",
      recipient: "First Meridian Bank",
      recipient_email: "corporate@meridianbank.com",
      subject: "Notice of Drawdown: $75,000 Revolving Credit Facility",
      draft_content:
        "Dear Relationship Manager,\n\nDoyle Ltd Logistics is requesting a formal drawdown of $75,000 from our existing revolving credit facility to bridge our seasonal working capital dip ahead of VAT settlement.",
      estimated_impact: 75000,
      time_to_impact_days: 7,
      status: "PENDING",
    }),
  ];
}

export function getFallbackCopilotAnalysis(organizationId: number = 2): CopilotAnalysisResponse {
  const isHealthy = organizationId === 1;
  const actionDrafts = getFallbackActionDrafts(organizationId);

  if (isHealthy) {
    return {
      organization_id: 1,
      as_of_date: new Date().toISOString(),
      is_at_risk: false,
      detected_risks: [
        {
          type: "EXCESS_IDLE_CASH",
          severity: "LOW",
          date: new Date().toISOString().split("T")[0],
          description: "Operating account holds surplus cash above policy buffer. Recommended for overnight yield sweep.",
          shortfall_amount: 0,
        },
      ],
      recommended_actions: [
        {
          type: "TREASURY_OPTIMIZATION",
          priority: "P2",
          title: "Overnight Treasury Sweep",
          potential_cash_gain: 4332.58,
          time_to_impact_days: 1,
          details: "Sweep balances exceeding $100k into overnight reserves.",
        },
        {
          type: "EARLY_PAYMENT_DISCOUNT",
          priority: "P1",
          title: "Prompt Payment Discount Option",
          potential_cash_gain: 4532.81,
          time_to_impact_days: 5,
          details: "2% discount on 10-day settlement.",
        },
      ],
      reasoning_trace: [
        "Forecast trajectory remains solvent throughout the 13-week window.",
        "Cash buffer is healthy with no acute deficits detected.",
        "Synthesized 2 yield enhancement and working capital levers.",
      ],
      action_drafts: actionDrafts,
    };
  }

  return {
    organization_id: 2,
    as_of_date: new Date().toISOString(),
    is_at_risk: true,
    detected_risks: [
      {
        type: "LIQUIDITY_DEFICIT",
        severity: "HIGH",
        date: "2026-03-23",
        description: "Primary account stays negative 18 consecutive days; no committed overdraft behind it.",
        shortfall_amount: 38600,
      },
      {
        type: "EXPENSE_SHOCK",
        severity: "HIGH",
        date: "2026-03-07",
        description: "$41,900 due for quarterly VAT settlement lands in the same week as 28 March payroll.",
        shortfall_amount: 41900,
      },
      {
        type: "POLICY_FLOOR_BREACH",
        severity: "MEDIUM",
        date: "2026-02-21",
        description: "Cash buffer falls to 9 days against a 21-day floor of $120,000.",
        shortfall_amount: 120000,
      },
    ],
    recommended_actions: [
      {
        type: "INVOICE_FACTORING",
        priority: "P1",
        title: "Accelerate overdue receivables",
        potential_cash_gain: 46800,
        time_to_impact_days: 2,
        details: "Factor high-value overdue AR invoices.",
      },
      {
        type: "EXTEND_AP_TERMS",
        priority: "P1",
        title: "Vendor AP Extension",
        potential_cash_gain: 31200,
        time_to_impact_days: 4,
        details: "Defer scheduled vendor bills by 30 days.",
      },
      {
        type: "CREDIT_LINE",
        priority: "P2",
        title: "Standby Credit Line Draw",
        potential_cash_gain: 75000,
        time_to_impact_days: 7,
        details: "Drawdown from existing revolving facility.",
      },
    ],
    reasoning_trace: [
      "It gets tight at the end of March. DSO moved out to 61 days and Q1 tax settlement lands in payroll week.",
      "Cash crosses zero on 23 March and bottoms at $38,600 under on 28 March.",
      "Clearing Northgate's invoice alone buys back nineteen days of runway.",
    ],
    action_drafts: actionDrafts,
  };
}

export async function createOrganization(
  payload: CreateOrganizationPayload
): Promise<{ organization_id: number; name: string; currency: string; status: string }> {
  try {
    const res = await secureFetch(`${API_BASE_URL}/api/v1/organizations`, {
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
  } catch (err) {
    console.warn("Backend provisioning offline, returning local demo tenant:", err);
    return {
      organization_id: 2,
      name: payload.name,
      currency: payload.currency || "USD",
      status: "PROVISIONED",
    };
  }
}

export async function getOrganizations(): Promise<OrganizationInfo[]> {
  try {
    const res = await secureFetch(`${API_BASE_URL}/api/v1/organizations`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (res.ok) {
      const orgs = await res.json();
      if (Array.isArray(orgs) && orgs.length > 0) {
        return orgs;
      }
    }
  } catch (err) {
    console.warn("Unable to fetch organizations from backend (using demo list):", err);
  }

  return [
    {
      id: 2,
      name: "Doyle Ltd Logistics (Deficit)",
      currency: "USD",
      current_cash_balance: -123875.78,
      monthly_burn: 74300,
      policy_floor: 120000,
    },
    {
      id: 1,
      name: "Rodriguez Technologies (Surplus)",
      currency: "USD",
      current_cash_balance: 125000.0,
      monthly_burn: 35000,
      policy_floor: 25000,
    },
  ];
}

export async function getForecast(
  organizationId: number = 2,
  asOfDate?: string
): Promise<ForecastResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/api/v1/forecast/${organizationId}`);
    if (asOfDate) {
      url.searchParams.append("as_of_date", asOfDate);
    }

    const res = await secureFetch(
      url.toString(),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
      organizationId
    );

    if (res.ok) {
      const data = await res.json();

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
      const mappedDaily: DailyForecast[] = rawDaily.map((d: RawDaily) => {
        const balance = d.closing_balance ?? d.projected_balance ?? 0;
        const isDeficit = balance < 0;
        const breakdown = d.breakdown;
        return {
          date: d.date,
          day_offset: d.day_index ?? d.day_offset ?? 0,
          projected_balance: balance,
          expected_inflow: d.total_inflow ?? d.expected_inflow ?? 0,
          expected_outflow: d.total_outflow ?? d.expected_outflow ?? 0,
          inflow_sources: breakdown?.ar_collections ? ["AR Collections"] : [],
          outflow_sources: breakdown
            ? Object.keys(breakdown).filter((k) => (breakdown[k] ?? 0) > 0)
            : [],
          is_weekend: false,
          is_low_water_mark: d.day_index === lwm.day_index,
          is_deficit: isDeficit,
          runway_days_remaining: isDeficit ? 0 : undefined,
        };
      });

      // Anchor Day 0 (today / as_of_date) if not already present
      const daily_projections: DailyForecast[] =
        mappedDaily.length > 0 && mappedDaily[0].day_offset > 0
          ? [
              {
                date: summary.as_of_date,
                day_offset: 0,
                projected_balance: summary.starting_cash,
                expected_inflow: 0,
                expected_outflow: 0,
                inflow_sources: [],
                outflow_sources: [],
                is_weekend: false,
                is_low_water_mark: false,
                is_deficit: summary.starting_cash < 0,
                runway_days_remaining: summary.starting_cash < 0 ? 0 : undefined,
              },
              ...mappedDaily,
            ]
          : mappedDaily;

      return {
        organization_id: data.organization_id || organizationId,
        organization_name: data.organization_name || (organizationId === 1 ? "Rodriguez Technologies" : "Doyle Ltd Logistics"),
        currency: data.currency || "USD",
        generated_at: data.generated_at || new Date().toISOString(),
        summary,
        daily_projections,
      };
    }
  } catch (err) {
    console.warn("Forecast fetch error, falling back to simulated demo:", err);
  }

  return getFallbackForecast(organizationId);
}

export async function runCopilotAnalysis(
  organizationId: number = 2,
  asOfDate?: string
): Promise<CopilotAnalysisResponse> {
  try {
    const url = new URL(
      `${API_BASE_URL}/api/v1/copilot/analyze/${organizationId}`
    );
    if (asOfDate) {
      url.searchParams.append("as_of_date", asOfDate);
    }

    const res = await secureFetch(
      url.toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      organizationId
    );

    if (res.ok) {
      const data = await res.json();

      interface RawRisk {
        type?: string;
        risk_type?: string;
        title?: string;
        severity?: string;
        date?: string;
        trigger_date?: string;
        description?: string;
        shortfall_amount?: number;
        deficit_amount?: number;
      }

      const detected_risks = (data.detected_risks || []).map((r: RawRisk) => ({
        type: r.type || r.risk_type || r.title || "LIQUIDITY_DEFICIT",
        severity: (r.severity || "MEDIUM").toUpperCase(),
        date: r.date || r.trigger_date || null,
        description: r.description || "",
        shortfall_amount: r.shortfall_amount ?? r.deficit_amount ?? 0,
      }));

      const action_drafts = (data.action_drafts || []).map((d: Record<string, unknown>) =>
        normalizeActionDraft(d)
      );

      return {
        organization_id: data.organization_id || organizationId,
        as_of_date: data.as_of_date || new Date().toISOString(),
        is_at_risk: data.forecast_snapshot?.is_at_risk ?? (detected_risks.length > 0),
        detected_risks,
        recommended_actions: data.recommended_actions || [],
        reasoning_trace: data.reasoning_trace || [],
        action_drafts,
      };
    }
  } catch (err) {
    console.warn("Copilot analysis fetch error, falling back to demo analysis:", err);
  }

  return getFallbackCopilotAnalysis(organizationId);
}

export async function getActionDrafts(
  organizationId: number = 2,
  status?: string
): Promise<ActionDraft[]> {
  try {
    const url = new URL(
      `${API_BASE_URL}/api/v1/copilot/actions/${organizationId}`
    );
    if (status) {
      url.searchParams.append("status", status);
    }

    const res = await secureFetch(
      url.toString(),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
      organizationId
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: Record<string, unknown>) => normalizeActionDraft(d));
      }
    }
  } catch (err) {
    console.warn("Unable to fetch action drafts from backend (using demo drafts):", err);
  }

  return getFallbackActionDrafts(organizationId);
}

export async function executeActionDraft(
  actionId: number,
  decision: "APPROVE" | "REJECT",
  notes?: string,
  organizationId?: number
): Promise<ActionExecutionResponse> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/copilot/actions/${actionId}/execute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes || "" }),
      },
      organizationId
    );

    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("Execution API call notice, applying local optimistic update:", err);
  }

  return {
    status: decision === "APPROVE" ? "EXECUTED" : "REJECTED",
    action_id: actionId,
    action_type: "REMEDIATION_ACTION",
    title: `Action #${actionId}`,
    executed_at: new Date().toISOString(),
    notes: notes || "",
    ledger_impact:
      decision === "APPROVE"
        ? `Action #${actionId} executed. Working capital timing updated on ledger.`
        : `Action #${actionId} was rejected.`,
    message: `Action #${actionId} processed successfully.`,
  };
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
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/plaid/create-link-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId }),
      },
      organizationId
    );
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("Plaid token API notice, returning simulated sandbox link token:", err);
  }

  return {
    link_token: `link-sandbox-${Date.now()}`,
    expiration: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    mode: "sandbox_simulated",
  };
}

export async function exchangePlaidPublicToken(payload: {
  public_token: string;
  organization_id: number;
  institution_id?: string;
  institution_name?: string;
}): Promise<PlaidExchangeResponse> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/plaid/exchange-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      payload.organization_id
    );
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("Plaid token exchange API notice, returning sandbox connection response:", err);
  }

  return {
    status: "CONNECTED",
    plaid_item_id: 1,
    item_id: "item-sandbox-1",
    institution_name: payload.institution_name || "Silicon Valley Bank (SVB)",
    sync_summary: {
      status: "SUCCESS",
      organization_id: payload.organization_id,
      synced_transactions: 3,
      current_cash_balance: 345000.0,
      synced_at: new Date().toISOString(),
    },
  };
}

export async function syncPlaidBankFeeds(organizationId: number): Promise<PlaidSyncResponse> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/plaid/sync/${organizationId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      organizationId
    );
    if (res.ok) {
      return res.json();
    }
  } catch {}

  return {
    status: "SUCCESS",
    organization_id: organizationId,
    synced_transactions: 3,
    current_cash_balance: 345000.0,
    synced_at: new Date().toISOString(),
  };
}

export async function getPlaidItems(organizationId: number): Promise<PlaidItemInfo[]> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/plaid/items/${organizationId}`,
      {
        cache: "no-store",
      },
      organizationId
    );
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
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/integrations/accounting/connect/${provider}?organization_id=${organizationId}`,
      { cache: "no-store" },
      organizationId
    );
    if (res.ok) {
      return res.json();
    }
  } catch {}

  return {
    provider,
    auth_url: `/api/v1/integrations/accounting/callback/${provider}?code=simulated_code&state=org_${organizationId}_test`,
    mode: "simulated",
  };
}

export async function syncAccountingLedger(
  organizationId: number,
  provider: "xero" | "quickbooks" = "xero"
): Promise<AccountingSyncResponse> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/integrations/accounting/sync/${organizationId}?provider=${provider}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      organizationId
    );
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("Accounting sync notice, simulating successful ledger ingestion:", err);
  }

  return {
    status: "SUCCESS",
    provider,
    organization_id: organizationId,
    ar_invoices_synced: 14,
    ap_bills_synced: 8,
    total_invoices_synced: 22,
    synced_at: new Date().toISOString(),
  };
}

export async function getAccountingConnections(organizationId: number): Promise<AccountingConnectionInfo[]> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/integrations/accounting/connections/${organizationId}`,
      { cache: "no-store" },
      organizationId
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// =====================================================================
// COMPLIANCE AUDIT TRAIL & EXECUTIVE ACTIONS CLIENT
// =====================================================================

export function getFallbackAuditLogs(organizationId: number = 2): AuditLogEntry[] {
  const isHealthy = organizationId === 1;
  const user = isHealthy ? "treasury@rodriguez.tech" : "cfo@doyle.com";
  return [
    {
      id: "ae-8921-b3fa-4921",
      organization_id: organizationId,
      user_email: user,
      user_id: "user_clerk_cfo",
      action_type: "APPROVE_ACTION_DRAFT",
      payload_summary: JSON.stringify({
        action_type: "EXTEND_AP_TERMS",
        title: "Vendor AP Terms Extension (+30d)",
        estimated_impact: 54200,
        notes: "Executive decision executed on ledger to bridge Week 04 low-water mark.",
      }),
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "ae-7182-f04c-1192",
      organization_id: organizationId,
      user_email: user,
      user_id: "user_clerk_cfo",
      action_type: "SYNC_QUICKBOOKS",
      payload_summary: JSON.stringify({
        invoices_synced: 22,
        ar_count: 14,
        ap_count: 8,
        status: "SUCCESS",
      }),
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: "ae-5093-d12a-8834",
      organization_id: organizationId,
      user_email: user,
      user_id: "user_clerk_cfo",
      action_type: "UPDATE_POLICY_FLOOR",
      payload_summary: JSON.stringify({
        previous_policy_floor: isHealthy ? 20000 : 100000,
        new_policy_floor: isHealthy ? 25000 : 120000,
        rationale: "Quarterly liquidity resilience and treasury risk buffer mandate.",
      }),
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
      id: "ae-3419-e89b-0012",
      organization_id: organizationId,
      user_email: "treasury@svb.bank",
      user_id: "user_plaid_feed",
      action_type: "SYNC_PLAID",
      payload_summary: JSON.stringify({
        institution: "Silicon Valley Bank (SVB)",
        synced_transactions: 3,
        current_cash_balance: isHealthy ? 125000 : 345000,
      }),
      timestamp: new Date(Date.now() - 3600000 * 96).toISOString(),
    },
    {
      id: "ae-1002-a10f-7743",
      organization_id: organizationId,
      user_email: "compliance@cashpulse.internal",
      user_id: "user_system_admin",
      action_type: "TENANT_PROVISIONED",
      payload_summary: JSON.stringify({
        name: isHealthy ? "Rodriguez Technologies" : "Doyle Ltd Logistics",
        currency: "USD",
        monthly_burn: isHealthy ? 35000 : 74300,
        status: "PROVISIONED",
      }),
      timestamp: new Date(Date.now() - 3600000 * 168).toISOString(),
    },
  ];
}

export async function getAuditLogs(
  organizationId: number = 2,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/audit-logs/${organizationId}?limit=${limit}`,
      { cache: "no-store" },
      organizationId
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Audit logs API notice, using fallback compliance audit history:", err);
  }
  return getFallbackAuditLogs(organizationId);
}

export async function updatePolicyFloor(
  organizationId: number,
  policyFloor: number,
  rationale?: string
): Promise<{ status: string; policy_floor: number; message: string }> {
  try {
    const res = await secureFetch(
      `${API_BASE_URL}/api/v1/organizations/${organizationId}/policy-floor`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_floor: policyFloor, rationale }),
      },
      organizationId
    );
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("Policy floor update API notice:", err);
  }
  return {
    status: "SUCCESS",
    policy_floor: policyFloor,
    message: `Policy floor updated to $${policyFloor.toLocaleString()}.`,
  };
}
