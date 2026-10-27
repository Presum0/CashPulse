import json
from datetime import date, datetime, timezone
from typing import Dict, Any, Optional, List
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import StateGraph, END
from sqlmodel import Session, delete, select

from app.models import ActionDraft, ActionDraftStatus
from app.agent.state import CopilotState, RiskItem, RecommendationItem, ActionDraftItem
from app.agent.tools import (
    get_overdue_invoices,
    get_upcoming_payables,
    get_historical_expenses,
    simulate_invoice_factoring,
    COPILOT_TOOLS,
)
from app.services.forecast import generate_13_week_forecast


def analyze_forecast_node(state: CopilotState) -> Dict[str, Any]:
    """
    Evaluates forecast summary metrics and detects concrete liquidity risks:
    - Cash deficit breaches (low-water mark < 0)
    - Runway cliffs
    - Low operational buffer (< 45 days burn)
    """
    forecast = state.get("forecast_summary", {})
    lwm = forecast.get("low_water_mark", {})
    is_deficit = lwm.get("is_deficit", False)
    deficit_amount = lwm.get("deficit_amount", 0.0)
    lwm_date = lwm.get("date")
    runway_days = forecast.get("runway_days")
    monthly_burn = forecast.get("estimated_monthly_burn", 0.0)
    starting_cash = forecast.get("starting_cash_balance", 0.0)

    risks: List[RiskItem] = []
    reasoning: List[str] = list(state.get("reasoning_trace", []))

    reasoning.append(
        f"Analyzed 13-week forecast: Starting Cash = ${starting_cash:,.2f}, "
        f"Low-Water Mark = ${lwm.get('amount', 0.0):,.2f} on {lwm_date}."
    )

    if is_deficit:
        risks.append(
            {
                "id": "risk-deficit",
                "severity": "HIGH",
                "risk_type": "LIQUIDITY_DEFICIT",
                "title": "Projected Cash Shortfall Breach",
                "description": (
                    f"Cash balance drops below zero on {lwm_date}, reaching a trough deficit "
                    f"of ${deficit_amount:,.2f}. Estimated runway is {runway_days} day(s)."
                ),
                "trigger_date": lwm_date,
                "deficit_amount": deficit_amount,
            }
        )
        status = "DEFICIT_DETECTED"
        reasoning.append(
            f"Detected acute liquidity deficit of ${deficit_amount:,.2f} on {lwm_date}. "
            "Routing to evaluate_mitigations node."
        )
    elif starting_cash < (monthly_burn * 1.5) and monthly_burn > 0:
        risks.append(
            {
                "id": "risk-low-buffer",
                "severity": "MEDIUM",
                "risk_type": "LOW_BUFFER",
                "title": "Thin Operating Cash Buffer",
                "description": (
                    f"Current liquidity (${starting_cash:,.2f}) covers less than 45 days of "
                    f"recurring monthly operational expenses (${monthly_burn:,.2f}/mo)."
                ),
                "trigger_date": lwm_date,
                "deficit_amount": 0.0,
            }
        )
        status = "AT_RISK"
        reasoning.append(
            "Detected thin liquidity buffer under 45 days burn. Routing to evaluate_mitigations node."
        )
    else:
        status = "HEALTHY"
        reasoning.append(
            "Forecast trajectory remains solvent throughout the 13-week window. "
            "Routing directly to synthesize_recommendations node."
        )

    return {
        "detected_risks": risks,
        "status": status,
        "reasoning_trace": reasoning,
    }


def check_risk_status_edge(state: CopilotState) -> str:
    """Conditional router: directs at-risk SMEs to mitigation engine; healthy SMEs to synthesis."""
    if state.get("status") in ["DEFICIT_DETECTED", "AT_RISK"] or len(state.get("detected_risks", [])) > 0:
        return "evaluate_mitigations"
    return "synthesize_recommendations"


def evaluate_mitigations_node(state: CopilotState) -> Dict[str, Any]:
    """
    Evaluates actionable working capital levers using typed database query tools:
    1. simulate_invoice_factoring: Calculates 85% advance on specific eligible customer invoices.
    2. get_upcoming_payables: Identifies specific vendor payments due during liquidity trough.
    3. get_overdue_invoices: Audits past-due debtor concentrations.
    """
    org_id = state.get("organization_id")
    forecast = state.get("forecast_summary", {})
    lwm = forecast.get("low_water_mark", {})
    deficit_amount = lwm.get("deficit_amount", 50000.0)

    recs: List[RecommendationItem] = []
    reasoning: List[str] = list(state.get("reasoning_trace", []))

    # --- Tool Execution 1: Simulate Invoice Factoring on Eligible AR ---
    factoring_result = simulate_invoice_factoring.invoke(
        {"organization_id": org_id, "advance_rate": 0.85, "discount_fee_pct": 0.03}
    )
    factoring_advance = factoring_result.get("immediate_cash_advance", 0.0)
    factored_invoices = factoring_result.get("invoices_selected", [])

    if factored_invoices:
        sample_customers = ", ".join(
            f"{inv['invoice_number']} ({inv['customer']}: ${inv['gross_amount']:,.2f})"
            for inv in factored_invoices[:2]
        )
        factoring_desc = (
            f"Advance 85% on {len(factored_invoices)} eligible customer invoices (including {sample_customers}) "
            f"to inject ${factoring_advance:,.2f} in immediate liquid working capital within 24–48 hours."
        )
    else:
        factoring_desc = (
            f"Establish an AR factoring facility against eligible client receivables to immediately unlock "
            f"up to ${factoring_advance:,.2f} in liquidity."
        )

    recs.append(
        {
            "id": "rec-factoring",
            "priority": 1,
            "action_type": "INVOICE_FACTORING",
            "title": "Accelerate Unpaid Invoices via AR Factoring",
            "description": factoring_desc,
            "estimated_impact": factoring_advance,
            "timeline": "Immediate (24–48 hrs)",
            "risk_addressed": "Projected Cash Shortfall Breach",
        }
    )
    reasoning.append(
        f"Tool 'simulate_invoice_factoring' selected {len(factored_invoices)} AR invoices totaling "
        f"${factoring_result.get('eligible_ar_volume', 0.0):,.2f}, unlocking ${factoring_advance:,.2f} advance."
    )

    # --- Tool Execution 2: Upcoming Payables Inspection for Vendor Extension ---
    payables_result = get_upcoming_payables.invoke(
        {"organization_id": org_id, "days_ahead": 30, "limit": 5}
    )
    top_payables = payables_result.get("top_payables", [])
    total_upcoming_ap = payables_result.get("total_upcoming_ap", 0.0)
    ap_deferral_impact = round(min(total_upcoming_ap * 0.5, max(deficit_amount * 0.35, 25000.0)), 2)

    if top_payables:
        sample_vendors = ", ".join(
            f"{p['vendor']} (${p['amount']:,.2f})" for p in top_payables[:2]
        )
        ap_desc = (
            f"Request temporary Net-30 payment extensions with top upcoming suppliers (including {sample_vendors}) "
            f"to defer ${ap_deferral_impact:,.2f} in cash outflows past the low-water mark date."
        )
    else:
        ap_desc = (
            f"Negotiate Net-30 terms extensions with major suppliers to preserve "
            f"${ap_deferral_impact:,.2f} in operational liquidity."
        )

    recs.append(
        {
            "id": "rec-extend-ap",
            "priority": 2,
            "action_type": "EXTEND_AP_TERMS",
            "title": "Negotiate Net-30 Vendor Payment Extensions",
            "description": ap_desc,
            "estimated_impact": ap_deferral_impact,
            "timeline": "Next 3–5 days",
            "risk_addressed": "Projected Cash Shortfall Breach",
        }
    )
    reasoning.append(
        f"Tool 'get_upcoming_payables' identified ${total_upcoming_ap:,.2f} in upcoming vendor liabilities; "
        f"targeted ${ap_deferral_impact:,.2f} for terms extension."
    )

    # --- Tool Execution 3: Overdue Invoices Audit & Credit Facility Sizing ---
    overdue_result = get_overdue_invoices.invoke({"organization_id": org_id, "limit": 5})
    total_overdue_ar = overdue_result.get("total_overdue_ar", 0.0)

    buffer_facility = round(deficit_amount * 1.25, 2)
    recs.append(
        {
            "id": "rec-credit-line",
            "priority": 3,
            "action_type": "CREDIT_LINE",
            "title": "Establish Secured Working Capital Bridge Facility",
            "description": (
                f"Secure an emergency standby credit line of ${buffer_facility:,.2f} (125% of trough deficit) "
                f"backed by ${total_overdue_ar:,.2f} in outstanding receivables to ensure uninterrupted payroll and operations."
            ),
            "estimated_impact": buffer_facility,
            "timeline": "Next 7–14 days",
            "risk_addressed": "Projected Cash Shortfall Breach",
        }
    )
    reasoning.append(
        f"Tool 'get_overdue_invoices' verified ${total_overdue_ar:,.2f} in outstanding AR collateral for "
        f"a ${buffer_facility:,.2f} emergency bridge facility."
    )

    return {
        "recommended_actions": recs,
        "reasoning_trace": reasoning,
    }


def synthesize_recommendations_node(state: CopilotState) -> Dict[str, Any]:
    """
    Compiles final recommendations, generates structured Action Drafts
    (outreach emails, formal proposals), and formats the executive summary.
    """
    org_name = state.get("organization_name", "the Organization")
    status = state.get("status", "HEALTHY")
    recs = list(state.get("recommended_actions", []))
    reasoning = list(state.get("reasoning_trace", []))
    forecast = state.get("forecast_summary", {})
    ending_cash = forecast.get("ending_cash_balance", 0.0)

    action_drafts: List[ActionDraftItem] = []

    if status == "HEALTHY":
        sweep_impact = round(ending_cash * 0.045 / 4.0, 2)
        discount_impact = round(forecast.get("total_projected_outflow", 50000.0) * 0.02, 2)

        recs.append(
            {
                "id": "rec-yield-optimization",
                "priority": 1,
                "action_type": "TREASURY_OPTIMIZATION",
                "title": "Automated Overnight Treasury Yield Sweep",
                "description": (
                    f"With a projected ending surplus of ${ending_cash:,.2f}, sweep idle operating balances "
                    "into high-yield treasury equivalents to generate passive yield while maintaining T+0 liquidity."
                ),
                "estimated_impact": sweep_impact,
                "timeline": "Next 14 days",
                "risk_addressed": "None (Optimization)",
            }
        )
        recs.append(
            {
                "id": "rec-early-discounts",
                "priority": 2,
                "action_type": "EARLY_PAYMENT_DISCOUNT",
                "title": "Capture Vendor Early Payment Discounts (2/10 Net 30)",
                "description": (
                    "Utilize excess cash reserves to settle supplier payables within 10 days in exchange "
                    "for a 2% discount, generating annualized risk-free returns exceeding 36% APR."
                ),
                "estimated_impact": discount_impact,
                "timeline": "Ongoing",
                "risk_addressed": "None (Optimization)",
            }
        )

        # Draft 1: Treasury Sweep Authorization
        action_drafts.append(
            {
                "id": None,
                "recommendation_id": "rec-yield-optimization",
                "action_type": "TREASURY_OPTIMIZATION",
                "title": "Draft Sweep Order: Automated Overnight Treasury Sweep",
                "description": f"Banking authorization to sweep operating balances over $100k into overnight yield reserves.",
                "estimated_impact": sweep_impact,
                "recipient": "Commercial Banking Treasury Desk",
                "subject": f"Authorization for Automated Overnight Liquidity Sweep - {org_name}",
                "draft_content": (
                    f"To: Corporate Treasury Operations Desk\n"
                    f"From: Finance & Treasury Team, {org_name}\n\n"
                    f"Please activate automated daily target-balance sweeps on our primary operating account "
                    f"into high-yield overnight liquidity funds for all balances exceeding $100,000. "
                    f"Projected quarterly yield enhancement is ${sweep_impact:,.2f}.\n\n"
                    f"Authorized by Corporate Treasury, {org_name}."
                ),
                "metadata_json": json.dumps({"target_balance_floor": 100000.0, "projected_yield": sweep_impact}),
                "approval_required": True,
                "status": "PENDING",
            }
        )

        # Draft 2: Early Payment Discount Offer
        action_drafts.append(
            {
                "id": None,
                "recommendation_id": "rec-early-discounts",
                "action_type": "EARLY_PAYMENT_DISCOUNT",
                "title": "Draft Vendor Proposal: 2/10 Net 30 Prompt Payment Discount",
                "description": f"Standardized vendor proposal offering 10-day settlement for a 2% discount.",
                "estimated_impact": discount_impact,
                "recipient": "Key Supplier Disbursements & AP Departments",
                "subject": f"Prompt Payment Discount Option (2/10 Net 30) - {org_name}",
                "draft_content": (
                    f"Dear Supplier Partner,\n\n"
                    f"{org_name} is pleased to offer accelerated settlement on all upcoming vendor invoices. "
                    f"Under our dynamic discounting program, we can remit payment within 10 days of invoice receipt "
                    f"in exchange for a standard 2.0% cash discount.\n\n"
                    f"Please confirm if your billing system accepts this early settlement term.\n\n"
                    f"Sincerely,\nDisbursements Team, {org_name}"
                ),
                "metadata_json": json.dumps({"discount_pct": 2.0, "estimated_savings": discount_impact}),
                "approval_required": True,
                "status": "PENDING",
            }
        )

        summary_msg = (
            f"CashPulse Copilot Treasury Assessment: {org_name} is in strong financial health. "
            f"Projected closing cash is ${ending_cash:,.2f} with zero deficit breaches over 91 days. "
            "Recommended strategy focuses on yield sweeps and supplier discount capture."
        )
    else:
        lwm = forecast.get("low_water_mark", {})
        deficit_amt = lwm.get("deficit_amount", 0.0)
        trough_date = lwm.get("date")

        for rec in recs:
            rec_type = rec["action_type"]
            rec_impact = rec["estimated_impact"]

            if rec_type == "INVOICE_FACTORING":
                action_drafts.append(
                    {
                        "id": None,
                        "recommendation_id": rec["id"],
                        "action_type": rec_type,
                        "title": "Draft Communication: Working Capital AR Factoring Advance",
                        "description": f"Formal authorization to factor eligible customer receivables unlocking ${rec_impact:,.2f}.",
                        "estimated_impact": rec_impact,
                        "recipient": "Factoring Partner / Customer Accounts Payable",
                        "subject": f"Working Capital Early Settlement / Factoring Notice - {org_name}",
                        "draft_content": (
                            f"Dear Accounts Payable Team,\n\n"
                            f"Please be advised that {org_name} has authorized our working capital liquidity partner "
                            f"to facilitate early settlement on our outstanding receivables (Total Value: ${rec_impact:,.2f}).\n\n"
                            f"If your accounting department processes invoices on accelerated payment terms (2/10 Net 30) "
                            f"or accepts digital clearing house settlement, please reply to this notice to release remittances directly.\n\n"
                            f"Sincerely,\nTreasury & Working Capital Operations\n{org_name}"
                        ),
                        "metadata_json": json.dumps({"action": "FACTORING_ADVANCE", "advance_amount": rec_impact}),
                        "approval_required": True,
                        "status": "PENDING",
                    }
                )
            elif rec_type == "EXTEND_AP_TERMS":
                action_drafts.append(
                    {
                        "id": None,
                        "recommendation_id": rec["id"],
                        "action_type": rec_type,
                        "title": "Draft Proposal: Supplier Net-30 Payment Extension Request",
                        "description": f"Supplier negotiation letter requesting Net-60 terms to defer ${rec_impact:,.2f} across the trough.",
                        "estimated_impact": rec_impact,
                        "recipient": "Major Suppliers Credit & Billing Department",
                        "subject": f"Partnership Terms Adjustment & Net-30 Extension Request - {org_name}",
                        "draft_content": (
                            f"Dear Supplier Accounts Receivable Team,\n\n"
                            f"As a long-standing customer, we appreciate our close partnership with your team. "
                            f"As part of our Q4 cash management schedule, {org_name} is requesting a temporary "
                            f"30-day payment extension (Net-60 terms) for scheduled payables totaling ${rec_impact:,.2f}.\n\n"
                            f"Our updated schedule confirms full payment execution following our operational billing cycle. "
                            f"We look forward to your positive confirmation.\n\n"
                            f"Best regards,\nAccounts Payable Team\n{org_name}"
                        ),
                        "metadata_json": json.dumps({"action": "EXTEND_TERMS_DAYS", "days": 30, "deferred_amount": rec_impact}),
                        "approval_required": True,
                        "status": "PENDING",
                    }
                )
            elif rec_type == "CREDIT_LINE":
                action_drafts.append(
                    {
                        "id": None,
                        "recommendation_id": rec["id"],
                        "action_type": rec_type,
                        "title": "Draft Application: Standby Working Capital Credit Facility",
                        "description": f"Credit facility application packet seeking ${rec_impact:,.2f} standby line.",
                        "estimated_impact": rec_impact,
                        "recipient": "Commercial Lending Relationship Desk (First Business Bank)",
                        "subject": f"Working Capital Standby Credit Facility Application - {org_name}",
                        "draft_content": (
                            f"Dear Commercial Underwriting Committee,\n\n"
                            f"{org_name} is formally requesting a revolving standby credit facility of ${rec_impact:,.2f}.\n\n"
                            f"This facility will serve as a liquidity safety buffer during seasonal working capital troughs "
                            f"and is backed by prime commercial accounts receivable. Detailed 13-week direct cash flow forecasts "
                            f"and receivables aging schedules are ready for review.\n\n"
                            f"Respectfully,\nChief Financial Officer\n{org_name}"
                        ),
                        "metadata_json": json.dumps({"action": "REQUEST_CREDIT_LINE", "facility_amount": rec_impact}),
                        "approval_required": True,
                        "status": "PENDING",
                    }
                )

        summary_msg = (
            f"CashPulse Copilot Liquidity Alert: {org_name} is facing a projected cash deficit "
            f"breaching zero on {trough_date} with a low-water mark of -${deficit_amt:,.2f}. "
            f"We have generated {len(action_drafts)} ready-to-execute action drafts requiring your approval."
        )

    reasoning.append(
        f"Synthesized executive treasury brief with {len(recs)} recommendations and "
        f"prepared {len(action_drafts)} structured Action Draft proposals."
    )

    return {
        "recommended_actions": recs,
        "action_drafts": action_drafts,
        "reasoning_trace": reasoning,
        "messages": [AIMessage(content=summary_msg)],
    }


# Construct and compile LangGraph Workflow
_workflow = StateGraph(CopilotState)
_workflow.add_node("analyze_forecast", analyze_forecast_node)
_workflow.add_node("evaluate_mitigations", evaluate_mitigations_node)
_workflow.add_node("synthesize_recommendations", synthesize_recommendations_node)

_workflow.set_entry_point("analyze_forecast")
_workflow.add_conditional_edges(
    "analyze_forecast",
    check_risk_status_edge,
    {
        "evaluate_mitigations": "evaluate_mitigations",
        "synthesize_recommendations": "synthesize_recommendations",
    },
)
_workflow.add_edge("evaluate_mitigations", "synthesize_recommendations")
_workflow.add_edge("synthesize_recommendations", END)

copilot_graph = _workflow.compile()


def run_copilot_workflow(
    session: Session,
    organization_id: int,
    as_of_date: Optional[date] = None,
) -> Optional[Dict[str, Any]]:
    """
    Entry point to run the LangGraph copilot workflow for an organization.
    1. Generates 13-week cash forecast.
    2. Initializes CopilotState.
    3. Executes StateGraph through risk detection, mitigation evaluation, and synthesis.
    4. Persists generated ActionDraft records to SQLite database.
    5. Formats clean JSON response for API consumers.
    """
    forecast_data = generate_13_week_forecast(
        session=session,
        organization_id=organization_id,
        as_of_date=as_of_date,
    )
    if not forecast_data:
        return None

    initial_state: CopilotState = {
        "organization_id": organization_id,
        "organization_name": forecast_data["organization_name"],
        "as_of_date": as_of_date.isoformat() if as_of_date else None,
        "forecast_summary": forecast_data["summary_metrics"],
        "detected_risks": [],
        "recommended_actions": [],
        "action_drafts": [],
        "messages": [
            HumanMessage(
                content=f"Analyze liquidity forecast and advise on working capital strategy for {forecast_data['organization_name']}."
            )
        ],
        "status": "HEALTHY",
        "reasoning_trace": [],
    }

    # Execute LangGraph
    final_state = copilot_graph.invoke(initial_state)

    # Clean up previous PENDING drafts for this organization
    session.exec(
        delete(ActionDraft).where(
            ActionDraft.organization_id == organization_id,
            ActionDraft.status == ActionDraftStatus.PENDING,
        )
    )

    # Persist newly generated ActionDrafts to database
    persisted_drafts: List[ActionDraft] = []
    for d in final_state.get("action_drafts", []):
        draft_record = ActionDraft(
            organization_id=organization_id,
            recommendation_id=d["recommendation_id"],
            action_type=d["action_type"],
            title=d["title"],
            description=d["description"],
            estimated_impact=d["estimated_impact"],
            recipient=d["recipient"],
            subject=d["subject"],
            draft_content=d["draft_content"],
            metadata_json=d.get("metadata_json"),
            approval_required=d.get("approval_required", True),
            status=ActionDraftStatus.PENDING,
        )
        session.add(draft_record)
        persisted_drafts.append(draft_record)

    session.commit()
    for draft_record in persisted_drafts:
        session.refresh(draft_record)

    # Format action drafts with their database IDs
    formatted_drafts = [
        {
            "id": dr.id,
            "recommendation_id": dr.recommendation_id,
            "action_type": dr.action_type,
            "title": dr.title,
            "description": dr.description,
            "estimated_impact": dr.estimated_impact,
            "recipient": dr.recipient,
            "subject": dr.subject,
            "draft_content": dr.draft_content,
            "approval_required": dr.approval_required,
            "status": dr.status.value,
            "created_at": dr.created_at.isoformat() if dr.created_at else None,
            "executed_at": dr.executed_at.isoformat() if dr.executed_at else None,
        }
        for dr in persisted_drafts
    ]

    # Extract last AI message content
    executive_summary = ""
    for msg in reversed(final_state.get("messages", [])):
        if isinstance(msg, AIMessage):
            executive_summary = msg.content
            break

    f_metrics = forecast_data["summary_metrics"]
    lwm = f_metrics.get("low_water_mark", {})

    return {
        "organization_id": organization_id,
        "organization_name": forecast_data["organization_name"],
        "status": final_state.get("status"),
        "executive_summary": executive_summary,
        "forecast_snapshot": {
            "starting_cash": f_metrics.get("starting_cash_balance"),
            "ending_cash": f_metrics.get("ending_cash_balance"),
            "low_water_mark": lwm.get("amount"),
            "low_water_date": lwm.get("date"),
            "runway_days": f_metrics.get("runway_days"),
            "is_at_risk": f_metrics.get("is_at_risk"),
            "estimated_monthly_burn": f_metrics.get("estimated_monthly_burn"),
        },
        "detected_risks": final_state.get("detected_risks", []),
        "recommended_actions": final_state.get("recommended_actions", []),
        "action_drafts": formatted_drafts,
        "reasoning_trace": final_state.get("reasoning_trace", []),
    }
