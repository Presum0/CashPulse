"use client";

import React from "react";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer id="security" className="mt-[60px] border-t-[2px] border-[#17150F] pt-[28px] pb-[36px]">
      {/* Top Strip: Security & Trust Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[20px] pb-[24px] border-b border-[#D6CEBC]">
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#2F5D3A]" />
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] font-semibold">
              Bank-Grade Encryption
            </p>
          </div>
          <p className="text-[11.5px] leading-[1.45] text-[#5E594D]">
            AES-256 at rest and TLS 1.3 in transit. Financial tokens never touch client devices.
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#2F5D3A]" />
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] font-semibold">
              Read-Only ERP Sync
            </p>
          </div>
          <p className="text-[11.5px] leading-[1.45] text-[#5E594D]">
            Scoped strictly to invoice dates and ledger balances. No write-back authorization required.
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#2F5D3A]" />
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] font-semibold">
              HITL Human Governance
            </p>
          </div>
          <p className="text-[11.5px] leading-[1.45] text-[#5E594D]">
            Zero autonomous capital movements. Every remediation draft requires explicit CFO signature.
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#2F5D3A]" />
            <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] font-semibold">
              Open Banking Standard
            </p>
          </div>
          <p className="text-[11.5px] leading-[1.45] text-[#5E594D]">
            Direct Fedwire, CHAPS, and Swift bank feed verification via regulated Plaid/Open Banking rails.
          </p>
        </div>
      </div>

      {/* Bottom Masthead & Copyright */}
      <div className="mt-[20px] flex flex-col sm:flex-row items-baseline justify-between gap-[14px]">
        <div className="flex items-baseline gap-[12px]">
          <span className="font-['Fraunces'] text-[20px] font-semibold leading-none tracking-[-0.02em]">
            CashPulse
          </span>
          <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.14em] text-[#7A7364]">
            Autonomous working capital intelligence &amp; 13-week treasury forecasting
          </p>
        </div>

        <div className="flex items-center gap-[16px] font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.12em] text-[#7A7364]">
          <Link href="/login" className="hover:text-[#17150F]">
            Sign In
          </Link>
          <span>·</span>
          <Link href="/signup" className="hover:text-[#17150F]">
            Create Account
          </Link>
          <span>·</span>
          <Link href="/dashboard" className="hover:text-[#17150F]">
            Treasury Desk
          </Link>
          <span>·</span>
          <span>© 2025 CashPulse Technologies. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
