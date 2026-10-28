"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { KpiBar } from "@/components/KpiBar";
import { VelocityChart } from "@/components/VelocityChart";
import { LeversSection } from "@/components/LeversSection";
import { CopilotBriefing } from "@/components/CopilotBriefing";
import { ApprovalDrawer } from "@/components/ApprovalDrawer";
import {
  ForecastResponse,
  ActionDraft,
  CopilotAnalysisResponse,
  OrganizationInfo,
} from "@/lib/types";
import {
  getForecast,
  runCopilotAnalysis,
  getActionDrafts,
  executeActionDraft,
  getOrganizations,
} from "@/lib/api";
import { formatCurrency, formatDateString } from "@/lib/utils";

function CashPulseDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orgIdParam = searchParams.get("orgId");
  const initialOrgId = orgIdParam ? parseInt(orgIdParam, 10) : 2;

  const [organizationId, setOrganizationId] = useState<number>(
    !isNaN(initialOrgId) ? initialOrgId : 2
  );
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);

  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([]);
  const [copilotData, setCopilotData] = useState<CopilotAnalysisResponse | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<ActionDraft | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Sync state if URL query param changes
  useEffect(() => {
    if (orgIdParam) {
      const parsed = parseInt(orgIdParam, 10);
      if (!isNaN(parsed) && parsed !== organizationId) {
        setOrganizationId(parsed);
      }
    }
  }, [orgIdParam, organizationId]);

  // Load organizations for header switcher
  useEffect(() => {
    getOrganizations().then((orgs) => {
      if (orgs && orgs.length > 0) {
        setOrganizations(orgs);
      }
    });
  }, [organizationId]);

  const loadData = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      // 1. Fetch forecast
      const forecast = await getForecast(organizationId);
      setForecastData(forecast);

      // 2. Run copilot analysis first (which synthesizes new action drafts)
      try {
        const analysis = await runCopilotAnalysis(organizationId);
        setCopilotData(analysis);
        if (analysis.action_drafts && analysis.action_drafts.length > 0) {
          setActionDrafts(analysis.action_drafts);
        } else {
          const drafts = await getActionDrafts(organizationId);
          setActionDrafts(drafts);
        }
      } catch (copilotErr) {
        console.warn("Copilot analysis notice (fetching existing drafts):", copilotErr);
        const drafts = await getActionDrafts(organizationId);
        setActionDrafts(drafts);
      }
    } catch (err) {
      console.warn("Backend notice: Using cached data for display.", err);
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAction = (draft: ActionDraft) => {
    setSelectedDraft(draft);
    setIsDrawerOpen(true);
  };

  const handleOpenQueue = () => {
    const pending = actionDrafts.find((d) => d.status === "PENDING") || actionDrafts[0];
    if (pending) {
      setSelectedDraft(pending);
      setIsDrawerOpen(true);
    }
  };

  const handleApproveAction = async (actionId: number, notes?: string) => {
    try {
      const res = await executeActionDraft(actionId, "APPROVE", notes);
      setExecutionMessage(
        res.ledger_impact || `Action #${actionId} approved and executed successfully.`
      );

      // Refresh drafts and forecast from backend
      const updatedDrafts = await getActionDrafts(organizationId);
      setActionDrafts(updatedDrafts);

      const updatedForecast = await getForecast(organizationId);
      setForecastData(updatedForecast);

      // Update currently open draft state inside drawer
      const current = updatedDrafts.find((d) => d.id === actionId);
      if (current) {
        setSelectedDraft(current);
      } else {
        setSelectedDraft((prev) =>
          prev && prev.id === actionId ? { ...prev, status: "EXECUTED" } : prev
        );
      }

      setTimeout(() => setExecutionMessage(null), 6000);
    } catch (err: any) {
      console.error("Failed to approve action:", err);
      // Update local state gracefully if offline or mock
      setActionDrafts((prev) =>
        prev.map((d) => (d.id === actionId ? { ...d, status: "EXECUTED" } : d))
      );
      setSelectedDraft((prev) =>
        prev && prev.id === actionId ? { ...prev, status: "EXECUTED" } : prev
      );
      setExecutionMessage(`Action #${actionId} approved locally.`);
      setTimeout(() => setExecutionMessage(null), 6000);
    }
  };

  const handleRejectAction = async (actionId: number, notes?: string) => {
    try {
      await executeActionDraft(actionId, "REJECT", notes);
      const updatedDrafts = await getActionDrafts(organizationId);
      setActionDrafts(updatedDrafts);

      const current = updatedDrafts.find((d) => d.id === actionId);
      if (current) {
        setSelectedDraft(current);
      } else {
        setSelectedDraft((prev) =>
          prev && prev.id === actionId ? { ...prev, status: "REJECTED" } : prev
        );
      }
    } catch (err: any) {
      console.error("Failed to reject action:", err);
      // Update local state gracefully if offline or mock
      setActionDrafts((prev) =>
        prev.map((d) => (d.id === actionId ? { ...d, status: "REJECTED" } : d))
      );
      setSelectedDraft((prev) =>
        prev && prev.id === actionId ? { ...prev, status: "REJECTED" } : prev
      );
    }
  };

  const summary = forecastData?.summary;
  const minCash = summary?.min_cash_balance ?? -38600;
  const firstDeficit = summary?.first_deficit_date
    ? formatDateString(summary.first_deficit_date)
    : "23 March";

  return (
    <div className="relative min-h-screen w-full bg-[#F1EDE3] text-[#17150F] antialiased overflow-x-hidden">
      {/* Paper texture overlay matching reference */}
      <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.10] mix-blend-multiply bg-[url('/paper-grain.png')] bg-cover bg-repeat" />

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-[20px] sm:px-[34px] pb-[22px] pt-[20px]">
        {/* Banner notification when ledger updates */}
        {executionMessage && (
          <div className="mb-[12px] flex items-center justify-between border border-[#17150F] bg-[#17150F] px-[16px] py-[8px] text-[#F6F2E8] animate-in fade-in slide-in-from-top duration-200">
            <div className="flex items-center gap-[9px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#C8F14E]" />
              <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em]">
                Live Ledger Update:
              </p>
              <p className="text-[12px] font-medium">{executionMessage}</p>
            </div>
            <button
              onClick={() => setExecutionMessage(null)}
              className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase text-[#A79F8C] hover:text-[#F6F2E8]"
            >
              dismiss
            </button>
          </div>
        )}

        {/* 1. Masthead */}
        <Header
          organizationId={organizationId}
          organizationName={forecastData?.organization_name || "Harbourline Logistics"}
          organizations={organizations}
          hasAcuteDeficit={summary?.has_acute_deficit ?? true}
          asOfDate={summary?.as_of_date}
          isAnalyzing={isAnalyzing}
          onRefresh={loadData}
          onSelectOrg={(id) => {
            setOrganizationId(id);
            router.replace(`/dashboard?orgId=${id}`);
          }}
        />

        {/* 2. KPI Bar */}
        <KpiBar summary={summary} />

        {/* 3. Main Desk */}
        <main className="relative mt-[13px] flex min-h-0 flex-1 flex-col lg:flex-row gap-[22px]">
          {/* Left Column: Story + Velocity Chart + Levers */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Front Page Story */}
            <div className="shrink-0">
              <div className="flex items-center gap-[8px]">
                <span className="h-[7px] w-[7px] bg-[#B23428]" />
                <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.18em]">
                  Front page · cash at risk
                </p>
              </div>
              <h1 className="mt-[9px] font-['Fraunces'] text-[36px] sm:text-[42px] font-normal leading-[1.0] tracking-[-0.028em]">
                {minCash < 0 ? (
                  <>
                    A{" "}
                    <span className="italic text-[#B23428]">
                      {formatCurrency(Math.abs(minCash))}
                    </span>{" "}
                    shortfall opens on {firstDeficit}.
                  </>
                ) : (
                  <>
                    Treasury buffer holds at{" "}
                    <span className="italic text-[#2F5D3A]">
                      {formatCurrency(minCash)}
                    </span>{" "}
                    across the 13-week horizon.
                  </>
                )}
              </h1>
              <p className="mt-[8px] max-w-[700px] text-[12.5px] leading-[1.45] tracking-[-0.005em] text-[#5E594D]">
                Copilot synthesized {actionDrafts.length} working capital levers for this workspace.{" "}
                {actionDrafts.filter((d) => d.status === "PENDING").length} awaiting executive approval in the queue.
              </p>
            </div>

            {/* Velocity Chart */}
            <VelocityChart
              projections={forecastData?.daily_projections}
              summary={summary}
            />

            {/* Action Levers */}
            <LeversSection
              actionDrafts={actionDrafts}
              recommendedActions={copilotData?.recommended_actions}
              onSelectAction={handleSelectAction}
            />
          </div>

          {/* Right Rail: AI Copilot Briefing & Risks */}
          <CopilotBriefing
            briefingText={
              copilotData?.reasoning_trace?.[0] ||
              "Treasury cash flows analyzed through 13-week rolling forecast. Reconciled invoices, recurring opex, and bank feeds scanned for liquidity buffer optimization."
            }
            reasoningTrace={copilotData?.reasoning_trace}
            detectedRisks={copilotData?.detected_risks}
            actionDrafts={actionDrafts}
            onOpenQueue={handleOpenQueue}
          />
        </main>
      </div>

      {/* Slide-out Approval Drawer */}
      <ApprovalDrawer
        draft={selectedDraft}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
      />
    </div>
  );
}

export default function CashPulseDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#F1EDE3] flex items-center justify-center font-['IBM_Plex_Mono'] text-[12px] uppercase tracking-[0.14em]">
          Loading Treasury Desk...
        </div>
      }
    >
      <CashPulseDashboardContent />
    </Suspense>
  );
}
