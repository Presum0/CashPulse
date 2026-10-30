export interface DailyForecast {
  date: string;
  day_offset: number;
  projected_balance: number;
  expected_inflow: number;
  expected_outflow: number;
  inflow_sources: string[];
  outflow_sources: string[];
  is_weekend: boolean;
  is_low_water_mark: boolean;
  is_deficit: boolean;
  runway_days_remaining?: number | null;
}

export interface ForecastSummary {
  as_of_date: string;
  horizon_days: number;
  starting_cash: number;
  ending_cash: number;
  net_burn: number;
  monthly_burn_rate: number;
  min_cash_balance: number;
  min_cash_date: string;
  max_cash_balance: number;
  max_cash_date: string;
  breach_count: number;
  has_acute_deficit: boolean;
  first_deficit_date?: string | null;
  runway_days?: number | null;
  total_expected_inflow: number;
  total_expected_outflow: number;
  policy_floor: number;
}

export interface ForecastResponse {
  organization_id: number;
  organization_name: string;
  currency: string;
  generated_at: string;
  summary: ForecastSummary;
  daily_projections: DailyForecast[];
}

export interface DetectedRisk {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  date?: string | null;
  description: string;
  shortfall_amount?: number;
}

export interface RecommendedAction {
  type: string;
  priority: string;
  title: string;
  potential_cash_gain: number;
  time_to_impact_days: number;
  details: string;
}

export interface ActionDraft {
  id: number;
  organization_id: number;
  action_type: string;
  priority?: string;
  title: string;
  recipient?: string | null;
  recipient_email?: string | null;
  subject?: string | null;
  body?: string | null;
  draft_content?: string | null;
  description?: string | null;
  recommendation_id?: string | null;
  cash_impact?: number;
  estimated_impact?: number;
  time_to_impact_days?: number;
  approval_required: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  created_at: string;
  executed_at?: string | null;
}

export interface CopilotAnalysisResponse {
  organization_id: number;
  as_of_date: string;
  is_at_risk: boolean;
  detected_risks: DetectedRisk[];
  recommended_actions: RecommendedAction[];
  reasoning_trace: string[];
  action_drafts: ActionDraft[];
}

export interface ActionExecutionResponse {
  status: "EXECUTED" | "REJECTED";
  action_id: number;
  action_type: string;
  title: string;
  executed_at?: string | null;
  notes?: string | null;
  ledger_impact?: string;
  message: string;
}

export interface CreateOrganizationPayload {
  name: string;
  currency: string;
  monthly_burn: number;
  policy_floor: number;
  starting_cash?: number;
  seed_demo_data?: boolean;
}

export interface OrganizationInfo {
  id: number;
  name: string;
  currency: string;
  current_cash_balance: number;
  monthly_burn?: number;
  policy_floor?: number;
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  mode: string;
}

export interface PlaidItemInfo {
  id: number;
  institution_name: string;
  institution_id?: string;
  status: string;
  accounts_count: number;
  last_synced_at?: string | null;
}

export interface AccountingConnectionInfo {
  id: number;
  provider: string;
  tenant_id?: string;
  status: string;
  last_synced_at?: string | null;
}

export interface PlaidExchangeResponse {
  status: string;
  plaid_item_id: number;
  item_id: string;
  institution_name: string;
  sync_summary: Record<string, unknown>;
}

export interface PlaidSyncResponse {
  status: string;
  organization_id: number;
  synced_transactions: number;
  current_cash_balance: number;
  synced_at: string;
}

export interface AccountingSyncResponse {
  status: string;
  provider: string;
  organization_id: number;
  ar_invoices_synced: number;
  ap_bills_synced: number;
  total_invoices_synced: number;
  synced_at: string;
}



