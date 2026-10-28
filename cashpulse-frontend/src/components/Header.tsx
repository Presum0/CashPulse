"use client";

import Link from "next/link";
import { formatFullDateString } from "@/lib/utils";
import { OrganizationInfo } from "@/lib/types";

interface HeaderProps {
  organizationId?: number;
  organizationName?: string;
  organizations?: OrganizationInfo[];
  hasAcuteDeficit?: boolean;
  asOfDate?: string;
  isAnalyzing?: boolean;
  onRefresh?: () => void;
  onSelectOrg?: (id: number) => void;
}

export function Header({
  organizationId = 2,
  organizationName = "Harbourline Logistics",
  organizations = [],
  hasAcuteDeficit = true,
  asOfDate,
  isAnalyzing = false,
  onRefresh,
  onSelectOrg,
}: HeaderProps) {
  const formattedDate = asOfDate
    ? formatFullDateString(asOfDate)
    : "Fri 14 Feb 2025 · 08:12 GMT";

  const orgInitials = organizationName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative flex shrink-0 items-center justify-between border-b-[2px] border-[#17150F] pb-[9px]">
      <div className="flex items-end gap-[14px]">
        <Link href="/" className="flex items-baseline gap-[7px] hover:opacity-80 transition-opacity">
          <span className="font-['Fraunces'] text-[25px] font-semibold leading-none tracking-[-0.025em]">
            CashPulse
          </span>
          <span className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.22em] text-[#8A8272]">
            desk
          </span>
        </Link>
        <div className="h-[16px] w-px bg-[#BDB5A2]" />
        <div className="flex flex-col gap-[4px]">
          <p className="font-['IBM_Plex_Mono'] text-[9.5px] uppercase leading-none tracking-[0.16em]">
            Treasury bulletin · 13-week rolling
          </p>
          <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.1em] text-[#7A7364]">
            {formattedDate} · forecast week 04 of 13
          </p>
        </div>
      </div>

      <div className="flex items-center gap-[10px]">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isAnalyzing}
            className="flex items-center gap-[6px] border border-[#BDB5A2] bg-[#F6F2E8] px-[10px] py-[6px] font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.14em] text-[#17150F] hover:bg-[#EAE3D2] transition-colors disabled:opacity-50"
            title="Refresh forecast and copilot analysis"
          >
            <span className={`inline-block ${isAnalyzing ? "animate-spin" : ""}`}>↻</span>
            {isAnalyzing ? "Analyzing..." : "Sync Forecast"}
          </button>
        )}

        <div className="relative flex items-center gap-[9px] border border-[#17150F] bg-[#F6F2E8] px-[9px] py-[5px]">
          <span className="flex h-[25px] w-[25px] items-center justify-center bg-[#17150F] font-['IBM_Plex_Mono'] text-[9.5px] leading-none tracking-[0.02em] text-[#F6F2E8]">
            {orgInitials || "HL"}
          </span>
          <div className="flex flex-col gap-[2px]">
            <span className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.2em] text-[#7A7364]">
              Organisation
            </span>
            {onSelectOrg ? (
              <select
                value={organizationId}
                onChange={(e) => onSelectOrg(Number(e.target.value))}
                className="bg-transparent text-[12.5px] font-semibold leading-none tracking-[-0.01em] outline-none cursor-pointer pr-4"
              >
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} (#{org.id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={2}>Doyle Ltd Logistics (Deficit Crunch)</option>
                    <option value={1}>Rodriguez Technologies (Surplus)</option>
                  </>
                )}
                {organizations &&
                  organizations.length > 0 &&
                  !organizations.some((o) => o.id === organizationId) && (
                    <option value={organizationId}>
                      {organizationName} (#{organizationId})
                    </option>
                  )}
              </select>
            ) : (
              <span className="text-[12.5px] font-semibold leading-none tracking-[-0.01em]">
                {organizationName}
              </span>
            )}
          </div>
          <span className="font-['IBM_Plex_Mono'] text-[8px] leading-none text-[#8A8272]">
            {organizationId || 2}
          </span>
        </div>

        {hasAcuteDeficit ? (
          <div className="flex items-center gap-[7px] bg-[#B23428] px-[10px] py-[7px] text-[#F6F2E8]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#F6F2E8] animate-ping" />
            <span className="font-['IBM_Plex_Mono'] text-[9.5px] font-semibold uppercase leading-none tracking-[0.18em]">
              Deficit detected
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-[7px] bg-[#2F5D3A] px-[10px] py-[7px] text-[#F6F2E8]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#C8F14E]" />
            <span className="font-['IBM_Plex_Mono'] text-[9.5px] font-semibold uppercase leading-none tracking-[0.18em]">
              Sufficient Buffer
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
