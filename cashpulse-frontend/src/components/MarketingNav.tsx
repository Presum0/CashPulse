"use client";

import React from "react";
import Link from "next/link";

export function MarketingNav() {
  return (
    <nav className="relative flex shrink-0 items-center justify-between border-b-[2px] border-[#17150F] pb-[12px] pt-[6px]">
      <div className="flex items-end gap-[18px]">
        <Link href="/" className="flex items-baseline gap-[7px] group">
          <span className="font-['Fraunces'] text-[26px] font-semibold leading-none tracking-[-0.025em] text-[#17150F]">
            CashPulse
          </span>
          <span className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.22em] text-[#8A8272] group-hover:text-[#17150F] transition-colors">
            desk
          </span>
        </Link>
        <div className="hidden sm:block h-[16px] w-px bg-[#BDB5A2]" />
        <div className="hidden md:flex items-center gap-[18px]">
          <a
            href="#forecast-engine"
            className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.16em] text-[#7A7364] hover:text-[#17150F] transition-colors"
          >
            13-Week Standard
          </a>
          <a
            href="#agent-intelligence"
            className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.16em] text-[#7A7364] hover:text-[#17150F] transition-colors"
          >
            LangGraph Copilot
          </a>
          <a
            href="#hitl-actions"
            className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.16em] text-[#7A7364] hover:text-[#17150F] transition-colors"
          >
            Remediation Levers
          </a>
          <a
            href="#security"
            className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.16em] text-[#7A7364] hover:text-[#17150F] transition-colors"
          >
            Security &amp; Feeds
          </a>
        </div>
      </div>

      <div className="flex items-center gap-[10px]">
        <Link
          href="/login"
          className="font-['IBM_Plex_Mono'] text-[9.5px] uppercase leading-none tracking-[0.16em] text-[#17150F] hover:underline px-[10px] py-[7px]"
        >
          Sign In
        </Link>

        <Link
          href="/signup"
          className="flex items-center gap-[6px] border border-[#17150F] bg-[#17150F] px-[14px] py-[8px] text-[#F6F2E8] hover:bg-[#26231C] transition-colors font-['IBM_Plex_Mono'] text-[9.5px] font-semibold uppercase leading-none tracking-[0.16em]"
        >
          <span>Get Started</span>
          <span className="text-[#C8F14E]">→</span>
        </Link>

        <Link
          href="/dashboard"
          className="hidden sm:flex items-center gap-[6px] border border-[#17150F] bg-[#F6F2E8] px-[12px] py-[8px] text-[#17150F] hover:bg-[#EAE3D2] transition-colors font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.14em]"
        >
          <span>Live Desk</span>
          <span className="h-[5px] w-[5px] rounded-full bg-[#B23428] animate-pulse" />
        </Link>
      </div>
    </nav>
  );
}
