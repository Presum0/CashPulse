"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@/lib/types";
import {
  getForecast,
  runCopilotAnalysis,
  getActionDrafts,
  executeActionDraft,
} from "@/lib/api";
import { formatCurrency, formatDateString } from "@/lib/utils";

export default function CashPulseDashboard() {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([]);
  const [copilotData, setCopilotData] = useState<CopilotAnalysisResponse | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<ActionDraft | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const [organizationId, setOrganizationId] = useState<number>(2);

  const loadData = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      // 1. Fetch forecast
      const forecast = await getForecast(organizationId);
      setForecastData(forecast);

      // 2. Fetch action drafts & copilot analysis
      let drafts = await getActionDrafts(organizationId);
      try {
        const analysis = await runCopilotAnalysis(organizationId);
        setCopilotData(analysis);
        if (drafts.length === 0 && analysis.action_drafts) {
          drafts = await getActionDrafts(organizationId);
        }
      } catch (copilotErr) {
        console.warn("Copilot analysis error:", copilotErr);
      }
      setActionDrafts(drafts);
    } catch (err) {
      console.warn("Backend not reached or error fetching live data. Fallback will display.", err);
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

  const handleApproveAction = async (actionId: number) => {
    try {
      const res = await executeActionDraft(actionId, "APPROVE");
      setExecutionMessage(
        res.ledger_impact || `Action #${actionId} approved and executed successfully.`
      );

      // Refresh drafts and forecast
      const updatedDrafts = await getActionDrafts(organizationId);
      setActionDrafts(updatedDrafts);

      const updatedForecast = await getForecast(organizationId);
      setForecastData(updatedForecast);

      // Update currently open draft state
      const current = updatedDrafts.find((d) => d.id === actionId);
      if (current) setSelectedDraft(current);

      setTimeout(() => setExecutionMessage(null), 6000);
    } catch (err) {
      console.error("Failed to approve action:", err);
      alert("Execution error occurred while approving action draft.");
    }
  };

  const handleRejectAction = async (actionId: number) => {
    try {
      await executeActionDraft(actionId, "REJECT");
      const updatedDrafts = await getActionDrafts(organizationId);
      setActionDrafts(updatedDrafts);

      const current = updatedDrafts.find((d) => d.id === actionId);
      if (current) setSelectedDraft(current);
    } catch (err) {
      console.error("Failed to reject action:", err);
      alert("Error occurred while rejecting action draft.");
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
          organizationName={forecastData?.organization_name || "Doyle Ltd Logistics"}
          hasAcuteDeficit={summary?.has_acute_deficit ?? true}
          asOfDate={summary?.as_of_date}
          isAnalyzing={isAnalyzing}
          onRefresh={loadData}
          onSelectOrg={(id) => setOrganizationId(id)}
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
                A{" "}
                <span className="italic text-[#B23428]">
                  {formatCurrency(Math.abs(minCash))}
                </span>{" "}
                shortfall opens on {firstDeficit}.
              </h1>
              <p className="mt-[8px] max-w-[700px] text-[12.5px] leading-[1.45] tracking-[-0.005em] text-[#5E594D]">
                Copilot drafted {actionDrafts.length || 3} levers that close it.{" "}
                {actionDrafts.filter((d) => d.status === "PENDING").length} need your signature before upcoming payroll and tax runs.
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
              "It gets tight at the end of March. Receivables have slowed for eleven weeks — DSO moved from 48 to 61 days since December — and the Q1 VAT settlement lands in the same week as the payroll run. Cash crosses zero on 23 March and bottoms at $38,600 under on 28 March. Clearing overdue receivables alone buys back critical days of runway."
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
