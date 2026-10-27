"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function MarketingLandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#F1EDE3] text-[#17150F] antialiased overflow-x-hidden">
      {/* Paper texture overlay matching console design */}
      <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.10] mix-blend-multiply bg-[url('/paper-grain.png')] bg-cover bg-repeat" />

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-[20px] sm:px-[34px] pb-[22px] pt-[16px]">
        {/* Navigation */}
        <MarketingNav />

        {/* HERO SECTION */}
        <section className="relative mt-[34px] flex flex-col lg:flex-row items-start justify-between gap-[36px] pb-[44px] border-b-[2px] border-[#17150F]">
          <div className="flex-1 max-w-[780px]">
            <div className="flex items-center gap-[8px]">
              <span className="h-[7px] w-[7px] bg-[#B23428]" />
              <p className="font-['IBM_Plex_Mono'] text-[9.5px] uppercase leading-none tracking-[0.18em]">
                Front Page · Treasury Intelligence
              </p>
            </div>

            <h1 className="mt-[14px] font-['Fraunces'] text-[46px] sm:text-[58px] lg:text-[64px] font-normal leading-[1.02] tracking-[-0.03em] text-[#17150F]">
              Autonomous working capital management for modern treasury teams.
            </h1>

            <p className="mt-[18px] max-w-[660px] text-[15px] sm:text-[16px] leading-[1.5] text-[#5E594D]">
              Stop flying blind on 30-day accounting lag. CashPulse combines real-time bank feeds with scheduled AP/AR invoices to deliver deterministic 13-week cash projections and synthesized, CFO-ready liquidity proposals.
            </p>

            <div className="mt-[28px] flex flex-wrap items-center gap-[14px]">
              <Link
                href="/signup"
                className="flex items-center gap-[8px] bg-[#17150F] px-[22px] py-[13px] text-[#F6F2E8] hover:bg-[#26231C] transition-all duration-150 font-['IBM_Plex_Mono'] text-[11px] font-semibold uppercase tracking-[0.16em] shadow-sm hover:shadow-md"
              >
                <span>Get Started — Free Trial</span>
                <span className="text-[#C8F14E]">→</span>
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center gap-[8px] border border-[#17150F] bg-[#F6F2E8] px-[20px] py-[13px] text-[#17150F] hover:bg-[#EAE3D2] transition-colors font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em]"
              >
                <span className="h-[5px] w-[5px] rounded-full bg-[#B23428]" />
                <span>Explore Live Desk Demo</span>
              </Link>
            </div>

            <p className="mt-[12px] font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.1em] text-[#8A8272]">
              5-minute onboarding · Read-only ERP integrations · zero commitment
            </p>
          </div>

          {/* HERO SPARKLINE PREVIEW CARD */}
          <div className="w-full lg:w-[480px] shrink-0 border border-[#17150F] bg-[#F6F2E8] p-[18px] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#D6CEBC] pb-[10px]">
              <div className="flex items-center gap-[7px]">
                <span className="flex h-[20px] w-[20px] items-center justify-center bg-[#17150F] font-['IBM_Plex_Mono'] text-[8px] text-[#F6F2E8]">
                  CP
                </span>
                <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] font-semibold">
                  13-Week Velocity Simulation
                </p>
              </div>
              <span className="bg-[#B23428] text-[#F6F2E8] px-[7px] py-[2px] font-['IBM_Plex_Mono'] text-[8px] uppercase font-semibold tracking-[0.14em]">
                Deficit Detected
              </span>
            </div>

            {/* Metric preview */}
            <div className="grid grid-cols-3 gap-[10px] py-[14px] border-b border-[#D6CEBC]">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#7A7364]">
                  Starting Cash
                </p>
                <p className="mt-[3px] font-['Fraunces'] text-[19px] leading-tight">
                  $482,400
                </p>
              </div>
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#7A7364]">
                  Low-Water Mark
                </p>
                <p className="mt-[3px] font-['Fraunces'] text-[19px] leading-tight text-[#B23428]">
                  −$38,600
                </p>
              </div>
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#7A7364]">
                  Runway to Zero
                </p>
                <p className="mt-[3px] font-['Fraunces'] text-[19px] leading-tight">
                  37 days
                </p>
              </div>
            </div>

            {/* Mini SVG Sparkline */}
            <div className="pt-[14px]">
              <div className="flex justify-between items-baseline text-[8px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] text-[#8A8272] mb-1">
                <span>Week 01 (Solvent)</span>
                <span className="text-[#B23428]">Week 10 (Trough −$38.6k)</span>
                <span>Week 13</span>
              </div>
              <svg viewBox="0 0 440 120" className="w-full h-[95px] overflow-visible">
                {/* Zero line */}
                <line x1="0" y1="80" x2="440" y2="80" stroke="#17150F" strokeWidth="1" />
                <text x="5" y="76" fontSize="7" fill="#8A8272" fontFamily="IBM Plex Mono">ZERO LINE $0</text>

                {/* Policy Floor line */}
                <line x1="0" y1="45" x2="440" y2="45" stroke="#8A8272" strokeWidth="0.8" strokeDasharray="3 3" />
                <text x="5" y="41" fontSize="6.5" fill="#8A8272" fontFamily="IBM Plex Mono">POLICY FLOOR $120K</text>

                {/* Deficit shaded area */}
                <polygon
                  points="290,80 340,105 380,100 440,95 440,80"
                  fill="#B23428"
                  fillOpacity="0.4"
                />

                {/* Solid actual curve */}
                <path
                  d="M0 20 L50 25 L100 32 L150 40"
                  fill="none"
                  stroke="#2F5D3A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Dashed forecast curve */}
                <path
                  d="M150 40 L200 52 L250 68 L290 80 L340 105 L380 100 L440 95"
                  fill="none"
                  stroke="#17150F"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  strokeOpacity="0.7"
                />

                {/* Trough circle marker */}
                <circle cx="340" cy="105" r="3.5" fill="#B23428" stroke="#F6F2E8" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="mt-[10px] flex items-center justify-between border-t border-[#D6CEBC] pt-[9px] text-[8.5px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] text-[#7A7364]">
              <span>Simulated with 185 Invoices</span>
              <Link href="/dashboard" className="text-[#17150F] font-semibold hover:underline">
                View Full Analysis →
              </Link>
            </div>
          </div>
        </section>

        {/* 3-COLUMN BROADSHEET FEATURES GRID */}
        <section id="forecast-engine" className="mt-[44px]">
          <div className="flex items-baseline justify-between border-b-[2px] border-[#17150F] pb-[10px]">
            <div className="flex items-baseline gap-[10px]">
              <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase leading-none tracking-[0.2em] font-semibold">
                Architecture &amp; Intelligence
              </p>
              <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.1em] text-[#7A7364]">
                The Three Pillars of CashPulse
              </p>
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.12em] text-[#8A8272]">
              Bulletin Edition No. 04
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px] mt-[18px]">
            {/* Pillar 1 */}
            <article className="border border-[#17150F] bg-[#F6F2E8] p-[20px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.16em] text-[#7A7364]">
                    Pillar 01 · Forecasting
                  </p>
                  <span className="border border-[#BDB5A2] px-[5px] py-[2px] font-['IBM_Plex_Mono'] text-[7.5px] text-[#7A7364]">
                    91-DAY
                  </span>
                </div>
                <h2 className="mt-[12px] font-['Fraunces'] text-[24px] leading-[1.1] font-normal tracking-[-0.02em]">
                  Deterministic 13-Week Direct Cash Engine
                </h2>
                <p className="mt-[10px] text-[13px] leading-[1.5] text-[#5E594D]">
                  Unlike backward-looking accrual models, CashPulse models cash timing day-by-day. We factor in payment velocity by customer, historical dispute lag, vendor payment terms, and fixed recurring OPEX.
                </p>
              </div>

              <div className="mt-[24px] border-t border-[#D6CEBC] pt-[12px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] text-[#7A7364] flex justify-between">
                <span>Low-water mark detection</span>
                <span className="text-[#2F5D3A]">✓ Active</span>
              </div>
            </article>

            {/* Pillar 2 */}
            <article id="agent-intelligence" className="border border-[#17150F] bg-[#E9E3D3] p-[20px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.16em] text-[#7A7364]">
                    Pillar 02 · Reasoning Agent
                  </p>
                  <span className="border border-[#17150F] bg-[#17150F] text-[#F6F2E8] px-[5px] py-[2px] font-['IBM_Plex_Mono'] text-[7.5px]">
                    LANGGRAPH
                  </span>
                </div>
                <h2 className="mt-[12px] font-['Fraunces'] text-[24px] leading-[1.1] font-normal tracking-[-0.02em]">
                  Autonomous Deficit &amp; Buffer Sentinel
                </h2>
                <p className="mt-[10px] text-[13px] leading-[1.5] text-[#5E594D]">
                  Our LangGraph state machine continuously interrogates liquidity forecasts against your policy floor. It isolates acute shortfall dates weeks in advance, running automated SQL tool queries against invoices and bank transactions.
                </p>
              </div>

              <div className="mt-[24px] border-t border-[#C4BCA9] pt-[12px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] text-[#7A7364] flex justify-between">
                <span>Multi-node reasoning trace</span>
                <span className="text-[#17150F] font-semibold">Live Trace</span>
              </div>
            </article>

            {/* Pillar 3 */}
            <article id="hitl-actions" className="border border-[#17150F] bg-[#17150F] text-[#F6F2E8] p-[20px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.16em] text-[#A79F8C]">
                    Pillar 03 · Governance
                  </p>
                  <span className="border border-[#6E6857] px-[5px] py-[2px] font-['IBM_Plex_Mono'] text-[7.5px] text-[#C9C1AD]">
                    HITL
                  </span>
                </div>
                <h2 className="mt-[12px] font-['Fraunces'] text-[24px] leading-[1.1] font-normal tracking-[-0.02em]">
                  Synthesized Action Drafts with Ledger Sync
                </h2>
                <p className="mt-[10px] text-[13px] leading-[1.5] text-[#C9C1AD]">
                  Never write manual collection emails or supplier extension requests again. CashPulse generates tailored, editable drafts that update your ledger timing instantly upon CFO signature approval.
                </p>
              </div>

              <div className="mt-[24px] border-t border-[#454134] pt-[12px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] text-[#C8F14E] flex justify-between">
                <span>AR Factoring · Net-30 Extension</span>
                <span>1-Click Sign</span>
              </div>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS STRIP */}
        <section className="mt-[48px] border-y-[2px] border-[#17150F] py-[32px]">
          <div className="flex flex-col md:flex-row items-start justify-between gap-[28px]">
            <div className="max-w-[260px]">
              <p className="font-['IBM_Plex_Mono'] text-[9.5px] uppercase tracking-[0.2em] font-semibold">
                Operational Flow
              </p>
              <h3 className="mt-[8px] font-['Fraunces'] text-[28px] leading-[1.08] tracking-[-0.02em]">
                From raw feeds to funded runway in minutes.
              </h3>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-[20px]">
              <div className="flex flex-col gap-[8px]">
                <span className="font-['IBM_Plex_Mono'] text-[11px] font-bold text-[#7A7364]">
                  01 / CONNECT
                </span>
                <p className="text-[13px] font-semibold leading-tight">
                  One-Click Read-Only Feeds
                </p>
                <p className="text-[12px] text-[#5E594D] leading-[1.4]">
                  Link primary commercial bank accounts via Plaid and sync unpaid bills from Xero, QuickBooks, or NetSuite.
                </p>
              </div>

              <div className="flex flex-col gap-[8px]">
                <span className="font-['IBM_Plex_Mono'] text-[11px] font-bold text-[#7A7364]">
                  02 / SIMULATE
                </span>
                <p className="text-[13px] font-semibold leading-tight">
                  Project Daily Liquidity
                </p>
                <p className="text-[12px] text-[#5E594D] leading-[1.4]">
                  The forecast engine computes exact closing balances for 91 days forward, pinpointing the date and size of any cash crunch.
                </p>
              </div>

              <div className="flex flex-col gap-[8px]">
                <span className="font-['IBM_Plex_Mono'] text-[11px] font-bold text-[#7A7364]">
                  03 / EXECUTE
                </span>
                <p className="text-[13px] font-semibold leading-tight">
                  Approve Remediation Levers
                </p>
                <p className="text-[12px] text-[#5E594D] leading-[1.4]">
                  Review pre-drafted counterparty emails and credit applications in the slide-out approval drawer to restore buffer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA DISPATCH CARD */}
        <section className="mt-[44px] border border-[#17150F] bg-[#17150F] text-[#F6F2E8] p-[32px] sm:p-[48px] flex flex-col md:flex-row items-center justify-between gap-[24px]">
          <div>
            <div className="flex items-center gap-[8px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#C8F14E] animate-pulse" />
              <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.18em] text-[#C8F14E]">
                Autonomous Treasury Protection
              </p>
            </div>
            <h2 className="mt-[10px] font-['Fraunces'] text-[32px] sm:text-[40px] leading-[1.05] tracking-[-0.025em]">
              Protect your cash runway before the next payroll crunch.
            </h2>
            <p className="mt-[10px] text-[13.5px] text-[#A79F8C] max-w-[560px]">
              Join finance leaders and treasury operators who rely on CashPulse for continuous working capital certainty.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-[12px] shrink-0">
            <Link
              href="/signup"
              className="w-full sm:w-auto text-center bg-[#C8F14E] text-[#17150F] px-[24px] py-[13px] font-['IBM_Plex_Mono'] text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#d6f76c] transition-colors"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-center border border-[#5B574A] px-[20px] py-[13px] font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.14em] text-[#F6F2E8] hover:bg-[#26231C] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Institutional Trust Footer */}
        <MarketingFooter />
      </div>
    </div>
  );
}
