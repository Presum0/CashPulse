"use client";

import React, { useState } from "react";
import { AuditLogEntry } from "@/lib/types";

interface AuditTrailViewProps {
  logs: AuditLogEntry[];
  organizationId: number;
  organizationName?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function AuditTrailView({
  logs,
  organizationId,
  organizationName = "Doyle Ltd Logistics",
  isLoading = false,
  onRefresh,
}: AuditTrailViewProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "ALL" && log.action_type !== filterAction) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action_type.toLowerCase().includes(q);
      const matchUser = (log.user_email || "").toLowerCase().includes(q);
      const matchSummary = (log.payload_summary || "").toLowerCase().includes(q);
      const matchId = log.id.toLowerCase().includes(q);
      return matchAction || matchUser || matchSummary || matchId;
    }
    return true;
  });

  const getActionBadge = (actionType: string) => {
    const act = actionType.toUpperCase();
    if (act.includes("APPROVE")) {
      return "bg-[#17150F] text-[#C8F14E] border-[#17150F]";
    }
    if (act.includes("REJECT")) {
      return "bg-[#B23428] text-[#F6F2E8] border-[#B23428]";
    }
    if (act.includes("PLAID") || act.includes("BANK")) {
      return "bg-[#EAE3D2] text-[#17150F] border-[#17150F]";
    }
    if (act.includes("QUICKBOOKS") || act.includes("XERO") || act.includes("ERP")) {
      return "bg-[#D6CEBC] text-[#17150F] border-[#8A8272]";
    }
    if (act.includes("POLICY") || act.includes("FLOOR")) {
      return "bg-[#17150F] text-[#F6F2E8] border-[#17150F]";
    }
    return "bg-[#F1EDE3] text-[#7A7364] border-[#BDB5A2]";
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " · " +
        d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) +
        " UTC"
      );
    } catch {
      return isoStr;
    }
  };

  const parseSummary = (raw?: string) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-[18px]">
      {/* Top Compliance Banner */}
      <div className="border border-[#17150F] bg-[#F6F2E8] p-[16px] sm:p-[20px] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] border-b border-[#D6CEBC] pb-[14px]">
          <div>
            <div className="flex items-center gap-[7px]">
              <span className="h-[6px] w-[6px] bg-[#17150F]" />
              <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.2em] text-[#7A7364]">
                Enterprise Governance Ledger
              </p>
            </div>
            <h2 className="mt-[4px] font-['Fraunces'] text-[24px] font-normal tracking-[-0.02em] text-[#17150F]">
              Immutable Compliance & Audit Trail
            </h2>
            <p className="mt-[3px] text-[12px] text-[#5E594D]">
              Complete chronological audit lineage of treasury interventions, AI copilot approvals, and ERP data syncs for{" "}
              <strong className="text-[#17150F]">{organizationName} (Tenant #{organizationId})</strong>.
            </p>
          </div>

          <div className="flex items-center gap-[8px]">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-[6px] border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[7px] font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#17150F] hover:bg-[#17150F] hover:text-[#F6F2E8] transition-colors disabled:opacity-50"
              >
                <span className={isLoading ? "animate-spin" : ""}>↻</span>
                {isLoading ? "Querying..." : "Verify & Refresh"}
              </button>
            )}
            <div className="border border-[#BDB5A2] bg-[#F1EDE3] px-[10px] py-[6px] font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.12em] text-[#7A7364]">
              Chain: <span className="text-[#17150F] font-semibold">Strict Tenant Scoped</span>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-[14px] grid grid-cols-2 sm:grid-cols-4 gap-[10px]">
          <div className="border border-[#D6CEBC] bg-[#FFFDF7] p-[10px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
              Recorded Events
            </p>
            <p className="font-['Fraunces'] text-[20px] font-semibold text-[#17150F] mt-[2px]">
              {logs.length}
            </p>
          </div>
          <div className="border border-[#D6CEBC] bg-[#FFFDF7] p-[10px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
              Tamper Verification
            </p>
            <p className="font-['Fraunces'] text-[20px] font-semibold text-[#2F5D3A] mt-[2px]">
              100% Sealed
            </p>
          </div>
          <div className="border border-[#D6CEBC] bg-[#FFFDF7] p-[10px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
              Active Tenant Isolation
            </p>
            <p className="font-['Fraunces'] text-[20px] font-semibold text-[#17150F] mt-[2px]">
              Org #{organizationId}
            </p>
          </div>
          <div className="border border-[#D6CEBC] bg-[#FFFDF7] p-[10px]">
            <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
              Compliance Standard
            </p>
            <p className="font-['Fraunces'] text-[20px] font-semibold text-[#17150F] mt-[2px]">
              SOC-2 / ISO 27001
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[10px] border border-[#17150F] bg-[#F6F2E8] p-[10px]">
        <div className="flex flex-wrap items-center gap-[6px]">
          <span className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mr-[4px]">
            Filter Action:
          </span>
          {[
            { id: "ALL", label: "All Events" },
            { id: "APPROVE_ACTION_DRAFT", label: "Approvals" },
            { id: "SYNC_QUICKBOOKS", label: "QuickBooks" },
            { id: "SYNC_PLAID", label: "Bank Feeds" },
            { id: "UPDATE_POLICY_FLOOR", label: "Policy Floor" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterAction(tab.id)}
              className={`px-[8px] py-[3px] font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.12em] transition-colors border ${
                filterAction === tab.id
                  ? "border-[#17150F] bg-[#17150F] text-[#F6F2E8]"
                  : "border-[#D6CEBC] bg-[#FFFDF7] text-[#5E594D] hover:border-[#17150F]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hash, user or action..."
            className="w-full sm:w-[260px] border border-[#17150F] bg-[#FFFDF7] px-[10px] py-[5px] text-[11px] font-['IBM_Plex_Mono'] text-[#17150F] placeholder-[#8A8272] outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-[#17150F] bg-[#FFFDF7] shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#17150F] bg-[#F1EDE3] text-[8.5px] font-['IBM_Plex_Mono'] uppercase tracking-[0.14em] text-[#7A7364]">
              <th className="py-[10px] px-[14px]">Timestamp (UTC)</th>
              <th className="py-[10px] px-[12px]">Action Category</th>
              <th className="py-[10px] px-[12px]">Actor Identity</th>
              <th className="py-[10px] px-[14px]">Executive Summary & Evidence</th>
              <th className="py-[10px] px-[12px] text-right">Audit Record ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE3D2] text-[11.5px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-[36px] text-center text-[#7A7364] font-['IBM_Plex_Mono'] text-[11px]">
                  No matching compliance logs found for active tenant filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const summary = parseSummary(log.payload_summary);
                const isSelected = selectedLog?.id === log.id;

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(isSelected ? null : log)}
                    className={`cursor-pointer transition-colors hover:bg-[#F6F2E8] ${
                      isSelected ? "bg-[#F1EDE3]" : ""
                    }`}
                  >
                    <td className="py-[11px] px-[14px] whitespace-nowrap font-['IBM_Plex_Mono'] text-[10px] text-[#5E594D]">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-[11px] px-[12px] whitespace-nowrap">
                      <span
                        className={`inline-block border px-[7px] py-[2px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] font-semibold ${getActionBadge(
                          log.action_type
                        )}`}
                      >
                        {log.action_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-[11px] px-[12px] whitespace-nowrap font-['IBM_Plex_Mono'] text-[10.5px] text-[#17150F]">
                      {log.user_email || log.user_id || "system.daemon"}
                    </td>
                    <td className="py-[11px] px-[14px] text-[#26231C] max-w-[420px] truncate">
                      {typeof summary === "object" && summary !== null ? (
                        <span className="font-mono text-[10.5px]">
                          {summary.title ||
                            summary.event ||
                            summary.notes ||
                            summary.rationale ||
                            summary.message ||
                            JSON.stringify(summary)}
                        </span>
                      ) : (
                        <span>{String(summary || "No payload logged")}</span>
                      )}
                    </td>
                    <td className="py-[11px] px-[12px] text-right font-['IBM_Plex_Mono'] text-[9.5px] text-[#8A8272] whitespace-nowrap">
                      #{log.id.slice(0, 8)}…
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Log Detail Inspector Drawer */}
      {selectedLog && (
        <div className="border border-[#17150F] bg-[#F6F2E8] p-[18px] sm:p-[22px] shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#D6CEBC] pb-[10px]">
            <div className="flex items-center gap-[8px]">
              <span className="h-[6px] w-[6px] bg-[#17150F]" />
              <h3 className="font-['Fraunces'] text-[18px] text-[#17150F]">
                Audit Record Verification & Lineage
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#7A7364] hover:text-[#17150F]"
            >
              ✕ Close Detail
            </button>
          </div>

          <div className="mt-[14px] grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
                Event Record ID
              </p>
              <p className="font-['IBM_Plex_Mono'] text-[10.5px] font-semibold text-[#17150F] break-all mt-[2px]">
                {selectedLog.id}
              </p>
            </div>
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
                Execution Timestamp
              </p>
              <p className="font-['IBM_Plex_Mono'] text-[10.5px] text-[#17150F] mt-[2px]">
                {formatTimestamp(selectedLog.timestamp)}
              </p>
            </div>
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.16em] text-[#7A7364]">
                Actor Email / User ID
              </p>
              <p className="font-['IBM_Plex_Mono'] text-[10.5px] text-[#17150F] mt-[2px]">
                {selectedLog.user_email || "N/A"} ({selectedLog.user_id || "internal"})
              </p>
            </div>
          </div>

          <div className="mt-[14px]">
            <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
              Payload Summary (Immutable JSON Snapshot)
            </p>
            <pre className="border border-[#17150F] bg-[#FFFDF7] p-[12px] font-['IBM_Plex_Mono'] text-[10.5px] text-[#17150F] overflow-x-auto whitespace-pre-wrap leading-[1.5]">
              {(() => {
                const parsed = parseSummary(selectedLog.payload_summary);
                return typeof parsed === "object"
                  ? JSON.stringify(parsed, null, 2)
                  : String(selectedLog.payload_summary || "{}");
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
