"use client";

import React from "react";
import { ForecastSummary } from "@/lib/types";
import { formatCurrency, formatDateString } from "@/lib/utils";

interface KpiBarProps {
  summary?: ForecastSummary | null;
}

export function KpiBar({ summary }: KpiBarProps) {
  const startingCash = summary?.starting_cash ?? 482400;
  const endingCash = summary?.ending_cash ?? -18900;
  const minCashBalance = summary?.min_cash_balance ?? -38600;
  const minCashDate = summary?.min_cash_date ? formatDateString(summary.min_cash_date) : "28 Mar";
  const runwayDays = summary?.runway_days ?? 37;
  const firstDeficitDate = summary?.first_deficit_date ? formatDateString(summary.first_deficit_date) : "23 Mar";
  const monthlyBurn = summary?.monthly_burn_rate ?? 74300;
  const asOfDateStr = summary?.as_of_date ? formatDateString(summary.as_of_date) : "14 Feb";

  return (
    <section className="relative mt-[13px] grid shrink-0 grid-cols-2 md:grid-cols-5 border-y border-[#BDB5A2] bg-transparent">
      {/* 1. Starting Cash */}
      <div className="border-r border-[#D6CEBC] py-[11px] pr-[12px]">
        <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
          Starting cash
        </p>
        <p className="mt-[7px] font-['Fraunces'] text-[26px] leading-none tracking-[-0.02em]">
          {formatCurrency(startingCash)}
        </p>
        <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
          {asOfDateStr} · all accounts
        </p>
      </div>

      {/* 2. Ending Cash (wk 13) */}
      <div className="border-r border-[#D6CEBC] px-[14px] py-[11px]">
        <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
          Ending cash · wk 13
        </p>
        <p
          className={`mt-[7px] font-['Fraunces'] text-[26px] leading-none tracking-[-0.02em] ${
            endingCash < 0 ? "text-[#B23428]" : "text-[#17150F]"
          }`}
        >
          {formatCurrency(endingCash)}
        </p>
        <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
          13 weeks · before action
        </p>
      </div>

      {/* 3. Low-water mark */}
      <div className="border-r border-[#D6CEBC] px-[14px] py-[11px]">
        <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
          Low-water mark
        </p>
        <p
          className={`mt-[7px] font-['Fraunces'] text-[26px] leading-none tracking-[-0.02em] ${
            minCashBalance < 0 ? "text-[#B23428]" : "text-[#17150F]"
          }`}
        >
          {formatCurrency(minCashBalance)}
        </p>
        <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
          {minCashDate} · projected trough
        </p>
      </div>

      {/* 4. Runway to zero */}
      <div className="border-r border-[#D6CEBC] px-[14px] py-[11px]">
        <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
          Runway to zero
        </p>
        <p className="mt-[7px] font-['Fraunces'] text-[26px] leading-none tracking-[-0.02em]">
          {runwayDays !== null ? (
            <>
              {runwayDays}{" "}
              <span className="font-['Archivo'] text-[11px] font-medium tracking-[0.04em]">
                days
              </span>
            </>
          ) : (
            <>
              &gt;90{" "}
              <span className="font-['Archivo'] text-[11px] font-medium tracking-[0.04em]">
                days
              </span>
            </>
          )}
        </p>
        <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
          {runwayDays !== null ? `zero crossed ${firstDeficitDate}` : "no deficit expected"}
        </p>
      </div>

      {/* 5. Monthly burn */}
      <div className="px-[14px] py-[11px]">
        <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.16em] text-[#7A7364]">
          Monthly burn
        </p>
        <p className="mt-[7px] font-['Fraunces'] text-[26px] leading-none tracking-[-0.02em]">
          {formatCurrency(monthlyBurn)}
        </p>
        <p className="mt-[6px] font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
          90-day net average
        </p>
      </div>
    </section>
  );
}
