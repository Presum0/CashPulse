from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class RiskItem(TypedDict):
    id: str
    severity: str  # "HIGH" | "MEDIUM" | "LOW"
    risk_type: str  # "LIQUIDITY_DEFICIT" | "LOW_BUFFER" | "OVERDUE_AP_PRESSURE" | "OVERDUE_AR_AGING"
    title: str
    description: str
    trigger_date: Optional[str]
    deficit_amount: float


class RecommendationItem(TypedDict):
    id: str
    priority: int  # 1 (Urgent) to 4 (Strategic)
    action_type: str  # "INVOICE_FACTORING" | "EXTEND_AP_TERMS" | "EARLY_PAYMENT_DISCOUNT" | "CREDIT_LINE" | "TREASURY_OPTIMIZATION"
    title: str
    description: str
    estimated_impact: float  # Estimated cash unlocked or preserved ($)
    timeline: str  # e.g., "Immediate (24-48 hrs)", "Next 7 days"
    risk_addressed: str


class ActionDraftItem(TypedDict):
    id: Optional[int]
    recommendation_id: str
    action_type: str
    title: str
    description: str
    estimated_impact: float
    recipient: str
    subject: str
    draft_content: str
    metadata_json: Optional[str]
    approval_required: bool
    status: str


class CopilotState(TypedDict):
    organization_id: int
    organization_name: str
    as_of_date: Optional[str]
    forecast_summary: Dict[str, Any]
    detected_risks: List[RiskItem]
    recommended_actions: List[RecommendationItem]
    action_drafts: List[ActionDraftItem]
    messages: Annotated[List[BaseMessage], add_messages]
    status: str  # "HEALTHY" | "DEFICIT_DETECTED" | "AT_RISK"
    reasoning_trace: List[str]
