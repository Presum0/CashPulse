"use client";

import React from "react";
import { ActionDraft, RecommendedAction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface LeversSectionProps {
  actionDrafts: ActionDraft[];
  recommendedActions?: RecommendedAction[];
  onSelectAction: (draft: ActionDraft) => void;
}

export function LeversSection({
  actionDrafts,
  recommendedActions = [],
  onSelectAction,
}: LeversSectionProps) {
  // If we have action drafts from backend or fallback to initial cards
  const displayLevers = React.useMemo(() => {
    if (actionDrafts && actionDrafts.length > 0) {
      return actionDrafts.slice(0, 3);
    }

    // Default mock cards if database is freshly seeded or awaiting analysis
    const defaultLevers: ActionDraft[] = [
      {
        id: 1,
        organization_id: 1,
        action_type: "AR_FACTORING",
        priority: "P1",
        title: "Release the collection notice on invoice 4417",
        recipient: "Alexandra Whitmore",
        recipient_email: "ap@northgatefreight.com",
        subject: "Invoice 4417 — $18,400 open, payment date needed this week",
        body: "Invoice 4417 for $18,400 fell due on 3 February and is still open. Two further invoices — 4432 and 4448 — are now past terms, bringing the account balance to $46,800.",
        cash_impact: 46800,
        time_to_impact_days: 2,
        approval_required: true,
        status: "PENDING",
        created_at: "2025-02-14T08:12:00Z",
      },
      {
        id: 2,
        organization_id: 1,
        action_type: "EXTEND_AP_TERMS",
        priority: "P1",
        title: "Extend Net-30 to Net-60 across four open POs",
        recipient: "Apex Logistics Suppliers",
        recipient_email: "billing@apexlogistics.com",
        subject: "Request to defer payment terms to Net-60 for PO #8821-8824",
        body: "To align our working capital cycle, we request a 30-day extension on upcoming bills, deferring $31,200 into mid-April.",
        cash_impact: 31200,
        time_to_impact_days: 4,
        approval_required: true,
        status: "PENDING",
        created_at: "2025-02-14T08:12:00Z",
      },
      {
        id: 3,
        organization_id: 1,
        action_type: "CREDIT_LINE_DRAW",
        priority: "P2",
        title: "Draw down the $75,000 First Meridian bridge",
        recipient: "First Meridian Bank",
        recipient_email: "corporate@meridianbank.com",
        subject: "Notice of Drawdown: $75,000 Revolving Credit Facility",
        body: "Requesting formal drawdown of $75,000 from existing credit facility to bridge seasonal working capital dip.",
        cash_impact: 75000,
        time_to_impact_days: 7,
        approval_required: true,
        status: "PENDING",
        created_at: "2025-02-14T08:12:00Z",
      },
    ];
    return defaultLevers;
  }, [actionDrafts]);

  return (
    <section className="mt-[13px] grid shrink-0 grid-cols-1 md:grid-cols-3 gap-[13px]">
      {displayLevers.map((lever, index) => {
        const isFeatured = index === 0;
        const leverNumber = String(index + 1).padStart(2, "0");
        const priorityTag = lever.priority?.includes("P") ? lever.priority : "P1";

        let typeLabel = "ar acceleration";
        if (lever.action_type === "EXTEND_AP_TERMS") typeLabel = "vendor terms";
        else if (lever.action_type === "CREDIT_LINE_DRAW") typeLabel = "credit facility";

        return (
          <article
            key={lever.id || index}
            onClick={() => onSelectAction(lever)}
            className={`group relative flex h-[186px] flex-col border border-[#17150F] cursor-pointer transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md px-[13px] pb-[11px] pt-[12px] ${
              isFeatured
                ? "bg-[#17150F] text-[#F6F2E8]"
                : "bg-[#F6F2E8] text-[#17150F]"
            }`}
          >
            {/* Top row: Lever ID and Priority tag */}
            <div className="flex items-center justify-between">
              <p
                className={`font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.16em] ${
                  isFeatured ? "text-[#A79F8C]" : "text-[#8A8272]"
                }`}
              >
                Lever {leverNumber} · {typeLabel}
              </p>
              <span
                className={`border px-[5px] py-[2px] font-['IBM_Plex_Mono'] text-[7px] leading-none tracking-[0.14em] ${
                  isFeatured
                    ? "border-[#6E6857] text-[#C9C1AD]"
                    : "border-[#BDB5A2] text-[#7A7364]"
                }`}
              >
                {priorityTag}
              </span>
            </div>

            {/* Title */}
            <h2 className="mt-[9px] text-[14.5px] font-semibold leading-[1.2] tracking-[-0.015em] line-clamp-2">
              {lever.title}
            </h2>

            {/* Impact Metric */}
            <div className="mt-[10px] flex items-baseline gap-[7px]">
              <p
                className={`font-['Fraunces'] text-[24px] leading-none tracking-[-0.02em] ${
                  isFeatured ? "text-[#C8F14E]" : "text-[#17150F]"
                }`}
              >
                {formatCurrency(lever.cash_impact ?? lever.estimated_impact ?? 0, true)}
              </p>
              <p
                className={`font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] ${
                  isFeatured ? "text-[#8E8878]" : "text-[#8A8272]"
                }`}
              >
                in {lever.time_to_impact_days || 3} days
              </p>
            </div>

            {/* Footer row */}
            <div
              className={`mt-auto flex items-end justify-between border-t pt-[8px] ${
                isFeatured ? "border-[#454134]" : "border-[#D6CEBC]"
              }`}
            >
              <p
                className={`font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] ${
                  isFeatured ? "text-[#8E8878]" : "text-[#8A8272]"
                }`}
              >
                {lever.status === "EXECUTED" ? "✓ executed" : "awaiting signature"}
              </p>
              <span
                className={`text-[10.5px] font-medium leading-none ${
                  isFeatured
                    ? "text-[#C8F14E] group-hover:underline"
                    : "underline decoration-[#17150F]/30 underline-offset-[3px]"
                }`}
              >
                Review draft →
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
