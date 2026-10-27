"use client";

import React, { useState } from "react";
import { DetectedRisk, ActionDraft } from "@/lib/types";
import { formatDateString } from "@/lib/utils";

interface CopilotBriefingProps {
  briefingText?: string;
  reasoningTrace?: string[];
  detectedRisks?: DetectedRisk[];
  actionDrafts?: ActionDraft[];
  onOpenQueue?: () => void;
}

export function CopilotBriefing({
  briefingText,
  reasoningTrace = [],
  detectedRisks = [],
  actionDrafts = [],
  onOpenQueue,
}: CopilotBriefingProps) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const pendingCount = actionDrafts.filter(
    (d) => d.status === "PENDING"
  ).length;

  // Default detected risks if not provided
  const risksToDisplay: DetectedRisk[] =
    detectedRisks && detectedRisks.length > 0
      ? detectedRisks
      : [
          {
            type: "ACUTE_DEFICIT",
            severity: "HIGH",
            date: "2025-03-23",
            description:
              "Primary account stays negative 18 consecutive days; no committed overdraft behind it.",
          },
          {
            type: "EXPENSE_SHOCK",
            severity: "HIGH",
            date: "2025-03-07",
            description:
              "$41,900 due; the tax reserve holds $22,100 earmarked.",
          },
          {
            type: "POLICY_FLOOR_BREACH",
            severity: "MED",
            date: "2025-02-21",
            description:
              "Cash cover falls to 9 days against a 21-day floor on 21 Feb.",
          },
        ];

  const defaultBriefing =
    "It gets tight at the end of March. Receivables have slowed for eleven weeks — DSO moved from 48 to 61 days since December — and the Q1 VAT settlement of $41,900 lands in the same week as the 28 March payroll. Cash crosses zero on 23 March and bottoms at $38,600 under on 28 March. Clearing Northgate's invoice alone buys back nineteen days of runway.";

  return (
    <aside className="flex w-full lg:w-[418px] shrink-0 flex-col gap-[12px]">
      {/* 1. Briefing Narrative Section */}
      <section className="flex min-h-0 flex-1 flex-col border border-[#17150F] bg-[#E9E3D3] px-[16px] pb-[13px] pt-[13px]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#C4BCA9] pb-[9px]">
          <div className="flex items-center gap-[7px]">
            <svg
              viewBox="0 0 24 12"
              className="h-[9px] w-[18px] fill-none stroke-[#17150F]"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 6h4.5l2.5-4.4 3 8.8 2.6-4.4H23" />
            </svg>
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.18em]">
              Copilot briefing
            </p>
          </div>
          <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.12em] text-[#7A7364]">
            live reasoning
          </p>
        </div>

        <div className="mt-[12px] flex-1 overflow-y-auto pr-1">
          <p className="font-['Fraunces'] text-[17px] leading-[1.38] tracking-[-0.014em] text-[#17150F]">
            {briefingText || defaultBriefing}
          </p>

          {showFullAnalysis && reasoningTrace.length > 0 && (
            <div className="mt-[14px] border-t border-[#C4BCA9] pt-[10px] space-y-[6px]">
              <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#7A7364]">
                Agent Thinking Trace:
              </p>
              {reasoningTrace.map((step, idx) => (
                <div
                  key={idx}
                  className="font-['IBM_Plex_Mono'] text-[9.5px] leading-tight text-[#5E594D] bg-[#F1EDE3]/70 p-[6px] border border-[#D6CEBC]"
                >
                  {step}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex shrink-0 items-end justify-between border-t border-[#C4BCA9] pt-[10px]">
          <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-[1.5] tracking-[0.1em] text-[#7A7364]">
            sources · xero ledger
            <br />
            barclays · stripe · vat portal
          </p>
          <button
            onClick={() => setShowFullAnalysis(!showFullAnalysis)}
            className="text-[10.5px] font-medium leading-none underline decoration-[#17150F]/30 underline-offset-[3px] hover:text-[#17150F]"
          >
            {showFullAnalysis ? "Hide trace ←" : "Full analysis →"}
          </button>
        </div>
      </section>

      {/* 2. Detected Risks Box */}
      <section className="shrink-0 border border-[#17150F] bg-[#F6F2E8]">
        <div className="flex items-center justify-between border-b border-[#C4BCA9] px-[14px] py-[9px]">
          <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.18em]">
            Detected risks · {risksToDisplay.length}
          </p>
          <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
            langgraph v1.0
          </p>
        </div>

        {risksToDisplay.map((risk, index) => {
          const isHigh = risk.severity === "HIGH";
          const isLast = index === risksToDisplay.length - 1;
          const displayDate = risk.date ? formatDateString(risk.date) : "N/A";

          return (
            <div
              key={index}
              className={`px-[14px] py-[10px] ${
                !isLast ? "border-b border-[#D6CEBC]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-[10px]">
                <div className="flex items-center gap-[8px]">
                  <span
                    className={`px-[4px] py-[1.5px] font-['IBM_Plex_Mono'] text-[7px] leading-none tracking-[0.14em] border ${
                      isHigh
                        ? "border-[#B23428] text-[#B23428]"
                        : "border-[#7A7364] text-[#7A7364]"
                    }`}
                  >
                    {risk.severity}
                  </span>
                  <p className="text-[11.5px] font-semibold leading-none tracking-[-0.01em]">
                    {risk.type.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="font-['IBM_Plex_Mono'] text-[8px] leading-none text-[#7A7364]">
                  {displayDate}
                </p>
              </div>
              <p className="mt-[5px] text-[10.5px] leading-[1.4] text-[#5E594D]">
                {risk.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* 3. Approval Queue Banner */}
      <section
        onClick={onOpenQueue}
        className="flex shrink-0 items-center justify-between border border-[#17150F] bg-[#17150F] px-[14px] py-[11px] text-[#F6F2E8] cursor-pointer hover:bg-[#26231C] transition-colors"
      >
        <div>
          <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.18em] text-[#A79F8C]">
            Approval queue
          </p>
          <p className="mt-[5px] text-[12.5px] font-semibold leading-none tracking-[-0.01em]">
            {pendingCount > 0
              ? `${pendingCount} drafts awaiting signature`
              : "All actions approved & executed"}
          </p>
        </div>
        <div className="flex items-center gap-[5px] border border-[#5B574A] px-[7px] py-[4px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em] text-[#C9C1AD]">
          <span>⌘</span>
          <span>↵</span>
          <span className="ml-[3px]">
            {pendingCount > 0 ? "review" : "view"}
          </span>
        </div>
      </section>
    </aside>
  );
}
