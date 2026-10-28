"use client";

import React, { useEffect, useState } from "react";
import { ActionDraft } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ApprovalDrawerProps {
  draft: ActionDraft | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (actionId: number, notes?: string) => Promise<void>;
  onReject: (actionId: number, notes?: string) => Promise<void>;
}

export function ApprovalDrawer({
  draft,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: ApprovalDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editableBody, setEditableBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setEditableBody(draft.body || draft.draft_content || draft.description || "");
      setErrorMessage(null);
    }
  }, [draft]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !draft) return null;

  const handleApproveClick = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onApprove(draft.id, editableBody);
    } catch (err: any) {
      console.error("Approval error in drawer:", err);
      setErrorMessage(err.message || "Failed to execute approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onReject(draft.id, editableBody);
    } catch (err: any) {
      console.error("Rejection error in drawer:", err);
      setErrorMessage(err.message || "Failed to submit rejection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionCategory =
    draft.action_type === "EXTEND_AP_TERMS"
      ? "vendor terms"
      : draft.action_type === "CREDIT_LINE_DRAW"
      ? "credit line draw"
      : "ar acceleration";

  const isExecuted = draft.status === "EXECUTED";
  const isRejected = draft.status === "REJECTED";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-[#17150F]/45 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Slide-out drawer */}
      <aside className="relative flex h-full w-full max-w-[620px] flex-col border-l-[2px] border-[#17150F] bg-[#F6F2E8] font-['Archivo'] text-[#17150F] shadow-2xl z-10 antialiased overflow-hidden">
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#BDB5A2] px-[22px] py-[13px]">
          <div className="flex items-center gap-[9px]">
            <span className="h-[7px] w-[7px] bg-[#B23428]" />
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.18em]">
              Action #{draft.id} · {actionCategory}
            </p>
            <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
              / draft v3.1
            </p>
          </div>
          <div className="flex items-center gap-[9px]">
            <span className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#8A8272]">
              esc
            </span>
            <button
              onClick={onClose}
              className="flex h-[24px] w-[24px] items-center justify-center border border-[#BDB5A2] hover:bg-[#EAE3D2] transition-colors"
            >
              <svg
                viewBox="0 0 12 12"
                className="h-[9px] w-[9px] fill-none stroke-[#17150F]"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M1 1 11 11M11 1 1 11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="shrink-0 px-[22px] pb-[14px] pt-[15px]">
          <h1 className="font-['Fraunces'] text-[28px] font-normal leading-[1.1] tracking-[-0.026em]">
            {draft.title}
          </h1>
          <p className="mt-[8px] text-[11.5px] leading-[1.45] text-[#5E594D]">
            AI-synthesized working capital remediation proposal. Review the draft, modify if needed, and approve to execute live ledger changes.
          </p>
        </div>

        {/* Impact strip */}
        <div className="grid shrink-0 grid-cols-3 border-y border-[#17150F] bg-[#F1EDE3]">
          <div className="border-r border-[#D6CEBC] px-[20px] py-[11px]">
            <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
              Cash recovered
            </p>
            <p className="mt-[6px] font-['Fraunces'] text-[23px] leading-none tracking-[-0.02em] text-[#17150F]">
              {formatCurrency(draft.cash_impact ?? draft.estimated_impact ?? 0, true)}
            </p>
            <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
              in {draft.time_to_impact_days} days
            </p>
          </div>
          <div className="border-r border-[#D6CEBC] px-[16px] py-[11px]">
            <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
              Priority level
            </p>
            <p className="mt-[6px] font-['Fraunces'] text-[23px] leading-none tracking-[-0.02em]">
              {draft.priority || "P1"}
            </p>
            <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
              risk-weighted
            </p>
          </div>
          <div className="px-[16px] py-[11px]">
            <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
              Time to execute
            </p>
            <p className="mt-[6px] font-['Fraunces'] text-[23px] leading-none tracking-[-0.02em]">
              {(draft.time_to_impact_days || 2) * 24} hrs
            </p>
            <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
              direct api dispatch
            </p>
          </div>
        </div>

        {/* Workflow steps */}
        <div className="flex shrink-0 items-center gap-[8px] px-[22px] py-[11px]">
          <span className="flex items-center gap-[6px] border border-[#17150F] px-[8px] py-[4px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em]">
            <svg
              viewBox="0 0 10 8"
              className="h-[6px] w-[7px] fill-none stroke-[#2F5D3A]"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M1 4 3.6 6.8 9 1" />
            </svg>
            01 draft ready
          </span>
          <span
            className={`flex items-center gap-[6px] px-[8px] py-[4px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em] ${
              isExecuted
                ? "border border-[#17150F] bg-transparent text-[#17150F]"
                : "bg-[#17150F] text-[#F6F2E8]"
            }`}
          >
            <span
              className={`h-[4px] w-[4px] rounded-full ${
                isExecuted ? "bg-[#2F5D3A]" : "bg-[#C8F14E] animate-pulse"
              }`}
            />
            02 awaiting signature
          </span>
          <span
            className={`flex items-center gap-[6px] px-[8px] py-[4px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em] ${
              isExecuted
                ? "bg-[#17150F] text-[#C8F14E]"
                : "border border-[#BDB5A2] text-[#8A8272]"
            }`}
          >
            03 execute &amp; sync
          </span>
        </div>

        {/* Email draft card */}
        <div className="mx-[22px] flex min-h-0 flex-1 flex-col border border-[#17150F] bg-[#FFFDF7] shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-[#D6CEBC] px-[16px] py-[7px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.18em] text-[#8A8272]">
              Draft · editable
            </p>
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] leading-none tracking-[0.02em] text-[#8A8272]">
              from treasury@cashpulse.ai
            </p>
          </div>

          <div className="flex shrink-0 items-baseline gap-[10px] border-b border-[#EAE3D2] px-[16px] py-[6px]">
            <p className="w-[52px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.16em] text-[#8A8272]">
              to
            </p>
            <p className="text-[11.5px] leading-none tracking-[-0.005em]">
              {draft.recipient || "Key Contact"}{" "}
              <span className="text-[#57534A]">
                &lt;{draft.recipient_email || "billing@counterparty.com"}&gt;
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-baseline gap-[10px] border-b border-[#EAE3D2] px-[16px] py-[6px]">
            <p className="w-[52px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.16em] text-[#8A8272]">
              cc
            </p>
            <p className="text-[11.5px] leading-none text-[#57534A]">
              finance-audit@harbourline.co
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-[10px] border-b border-[#EAE3D2] px-[16px] py-[7px]">
            <p className="mt-[1px] w-[52px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-tight tracking-[0.16em] text-[#7A7362]">
              subject
            </p>
            <p className="text-[12.5px] font-medium leading-[1.3] tracking-[-0.01em]">
              {draft.subject || "Working Capital Notice & Term Adjustment"}
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-[#EAE3D2] bg-[#F8F4E9] px-[16px] py-[6px]">
            <div className="flex items-center gap-[8px]">
              <span className="h-[9px] w-[2px] bg-[#BDB5A2]" />
              <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#7A7364]">
                thread · 3 messages
              </p>
              <p className="text-[10.5px] leading-none text-[#57534A]">
                active vendor relationship
              </p>
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#8A8272]">
              verified counterpart
            </p>
          </div>

          {/* Editable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-[16px] py-[11px]">
            <textarea
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              disabled={isExecuted || isRejected}
              rows={8}
              className="w-full h-full resize-none bg-transparent font-['Archivo'] text-[12px] leading-[1.62] tracking-[-0.002em] text-[#26231C] outline-none disabled:opacity-80"
              placeholder="Enter email body..."
            />
          </div>

          {/* Copilot intelligence note */}
          <div className="flex shrink-0 items-start gap-[9px] border-t border-[#EAE3D2] bg-[#F1EDE1] px-[16px] py-[9px]">
            <svg
              viewBox="0 0 24 12"
              className="mt-[3px] h-[8px] w-[16px] shrink-0 fill-none stroke-[#57534A]"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 6h4.5l2.5-4.4 3 8.8 2.6-4.4H23" />
            </svg>
            <p className="text-[10.5px] leading-[1.5] text-[#57534A]">
              Copilot optimized proposal: Formulated to preserve counterparty goodwill while resolving near-term liquidity pressure.
            </p>
          </div>

          {/* Attachment footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-[#EAE3D2] bg-[#F8F4E9] px-[16px] py-[7px]">
            <div className="flex items-center gap-[7px]">
              <svg
                viewBox="0 0 12 14"
                className="h-[10px] w-[9px] fill-none stroke-[#7A7364]"
                strokeWidth="1.2"
                aria-hidden="true"
              >
                <path d="M1 1h6l4 4v8H1z" />
                <path d="M7 1v4h4" />
              </svg>
              <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.1em] text-[#7A7364]">
                Statement_Attachment.pdf · 2 pp
              </p>
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.1em] text-[#7A7364]">
              tone: firm, relationship-preserving
            </p>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-[22px] mt-[8px] flex items-center justify-between border border-[#B23428] bg-[#FDF2F0] px-[12px] py-[8px] text-[#B23428] text-[11px]">
            <div className="flex items-center gap-[6px]">
              <span className="font-bold">⚠</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-['IBM_Plex_Mono'] text-[8px] uppercase underline ml-2"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex shrink-0 items-center justify-between px-[22px] pb-[16px] pt-[13px] border-t border-[#D6CEBC] mt-[10px]">
          <div className="flex flex-col gap-[5px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em] text-[#7A7364]">
              approved by cfo delegated auth
            </p>
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.14em] text-[#8A8272]">
              send updates ledger via api in &lt;1s
            </p>
          </div>

          <div className="flex items-center gap-[9px]">
            {isExecuted ? (
              <span className="flex items-center gap-[6px] bg-[#2F5D3A] px-[16px] py-[10px] text-[#F6F2E8] text-[12px] font-semibold">
                ✓ Executed &amp; Synced
              </span>
            ) : isRejected ? (
              <span className="flex items-center gap-[6px] bg-[#B23428] px-[16px] py-[10px] text-[#F6F2E8] text-[12px] font-semibold">
                ✕ Rejected
              </span>
            ) : (
              <>
                <button
                  onClick={handleRejectClick}
                  disabled={isSubmitting}
                  className="flex items-center gap-[7px] border border-[#BDB5A2] bg-[#F6F2E8] px-[13px] py-[9px] hover:bg-[#EAE3D2] transition-colors disabled:opacity-50"
                >
                  <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
                    ⌘↵
                  </p>
                  <p className="text-[11.5px] font-medium leading-none text-[#57534A]">
                    Reject
                  </p>
                </button>

                <button
                  onClick={handleApproveClick}
                  disabled={isSubmitting}
                  className="flex items-center gap-[9px] bg-[#17150F] px-[16px] py-[10px] text-[#F6F2E8] hover:bg-[#26231C] transition-colors disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 10 8"
                    className="h-[7px] w-[9px] fill-none stroke-[#C8F14E]"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M1 4 3.6 6.8 9 1" />
                  </svg>
                  <p className="text-[12px] font-semibold leading-none tracking-[-0.005em]">
                    {isSubmitting ? "Executing..." : "Approve & send"}
                  </p>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
