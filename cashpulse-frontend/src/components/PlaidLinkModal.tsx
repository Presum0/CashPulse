"use client";

import React, { useState } from "react";
import Script from "next/script";
import { createPlaidLinkToken, exchangePlaidPublicToken } from "@/lib/api";
import { PlaidExchangeResponse } from "@/lib/types";

interface PlaidMetadata {
  institution?: {
    institution_id?: string;
    name?: string;
  };
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (public_token: string, metadata: PlaidMetadata) => void;
        onExit?: (err: unknown, metadata: PlaidMetadata) => void;
        onEvent?: (eventName: string, metadata: PlaidMetadata) => void;
      }) => {
        open: () => void;
        exit: () => void;
        destroy: () => void;
      };
    };
  }
}

interface PlaidLinkModalProps {
  organizationId: number;
  onSuccess: (result: PlaidExchangeResponse) => void;
  triggerButtonText?: string;
  className?: string;
}

export default function PlaidLinkModal({
  organizationId,
  onSuccess,
  triggerButtonText = "Connect Commercial Account (Plaid Link)",
  className = "",
}: PlaidLinkModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedSandboxBank, setSelectedSandboxBank] = useState("Silicon Valley Bank (SVB)");

  const sandboxBanks = [
    { name: "Silicon Valley Bank (SVB)", type: "Checking & Venture Debt", routing: "121140399" },
    { name: "J.P. Morgan Chase Commercial", type: "Operating Treasury", routing: "021000021" },
    { name: "Mercury Treasury Feed", type: "Money Market & Sweep", routing: "071124430" },
    { name: "First Republic / Citizens", type: "Commercial Checking", routing: "321070450" },
  ];

  async function handleLaunchPlaid() {
    setLoading(true);
    setStatusMessage("Requesting Plaid Link session...");
    try {
      const { link_token, mode } = await createPlaidLinkToken(organizationId);
      
      // If live Plaid script is available and not in pure local sandbox fallback
      if (typeof window !== "undefined" && window.Plaid && mode !== "sandbox_simulated") {
        const handler = window.Plaid.create({
          token: link_token,
          onSuccess: async (public_token, metadata) => {
            setStatusMessage("Exchanging token & synchronizing ledger...");
            try {
              const res = await exchangePlaidPublicToken({
                public_token,
                organization_id: organizationId,
                institution_id: metadata?.institution?.institution_id,
                institution_name: metadata?.institution?.name || "Connected Commercial Bank",
              });
              onSuccess(res);
              setIsOpen(false);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              setStatusMessage(`Exchange failed: ${msg}`);
            }
          },
          onExit: () => {
            setLoading(false);
            setStatusMessage("");
          },
        });
        handler.open();
        setLoading(false);
      } else {
        // Open high-fidelity Plaid sandbox simulator modal
        setIsOpen(true);
        setLoading(false);
      }
    } catch (err: unknown) {
      console.warn("Plaid token request notice, falling back to Sandbox UI:", err);
      setIsOpen(true);
      setLoading(false);
    }
  }

  async function handleConfirmSandboxLink() {
    setLoading(true);
    setStatusMessage(`Authenticating with ${selectedSandboxBank}...`);
    try {
      const public_token = `public-sandbox-${Date.now()}`;
      const res = await exchangePlaidPublicToken({
        public_token,
        organization_id: organizationId,
        institution_id: "ins_sandbox_commercial",
        institution_name: selectedSandboxBank,
      });
      setStatusMessage("Bank accounts verified! Ingesting initial feeds...");
      setTimeout(() => {
        setLoading(false);
        setIsOpen(false);
        onSuccess(res);
      }, 700);
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Error linking bank: ${msg}`);
    }
  }

  return (
    <>
      {/* Plaid Link Official Script */}
      <Script
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        strategy="lazyOnload"
      />

      <button
        type="button"
        onClick={handleLaunchPlaid}
        disabled={loading}
        className={
          className ||
          "px-4 py-2.5 bg-[#17150F] text-[#F1EDE3] font-['IBM_Plex_Mono'] text-xs font-semibold tracking-wider uppercase border border-[#17150F] hover:bg-[#2F5D3A] transition-colors flex items-center gap-2"
        }
      >
        <span className="w-2 h-2 rounded-full bg-[#C8F14E] animate-pulse"></span>
        {loading ? "Initializing..." : triggerButtonText}
      </button>

      {/* Plaid Sandbox / Link Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#17150F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F6F2E8] border-2 border-[#17150F] w-full max-w-lg shadow-[8px_8px_0px_#17150F] p-6 space-y-6">
            <div className="border-b border-[#BDB5A2] pb-4 flex justify-between items-start">
              <div>
                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-widest uppercase text-[#8A8272] block">
                  Plaid Link · Commercial Banking
                </span>
                <h3 className="font-['Fraunces'] text-2xl font-bold text-[#17150F] mt-1">
                  Connect Bank Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#17150F] font-mono text-sm border border-[#17150F] w-7 h-7 flex items-center justify-center hover:bg-[#17150F] hover:text-[#F1EDE3]"
              >
                ✕
              </button>
            </div>

            <p className="font-['Archivo'] text-sm text-[#5E594D] leading-relaxed">
              Connect your commercial depository accounts to stream real-time cash balances,
              automated Fedwire / ACH clearing feeds, and recurring vendor debits into CashPulse.
            </p>

            <div className="space-y-2">
              <label className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-wider text-[#17150F] font-semibold block">
                Select Institutional Provider (Sandbox)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sandboxBanks.map((b) => {
                  const isSelected = selectedSandboxBank === b.name;
                  return (
                    <div
                      key={b.name}
                      onClick={() => setSelectedSandboxBank(b.name)}
                      className={`cursor-pointer p-3 border transition-colors flex items-center justify-between ${
                        isSelected
                          ? "border-[#17150F] bg-[#17150F] text-[#F1EDE3]"
                          : "border-[#BDB5A2] bg-[#F1EDE3] text-[#17150F] hover:border-[#17150F]"
                      }`}
                    >
                      <div>
                        <div className="font-['Archivo'] font-semibold text-sm">{b.name}</div>
                        <div
                          className={`font-['IBM_Plex_Mono'] text-xs ${
                            isSelected ? "text-[#C8F14E]" : "text-[#7A7364]"
                          }`}
                        >
                          {b.type} · Routing: {b.routing}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-['IBM_Plex_Mono'] text-[10px] px-2 py-0.5 uppercase tracking-widest border ${
                            isSelected
                              ? "border-[#C8F14E] text-[#C8F14E]"
                              : "border-[#BDB5A2] text-[#8A8272]"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {statusMessage && (
              <div className="p-3 bg-[#E9E3D3] border border-[#17150F] font-['IBM_Plex_Mono'] text-xs text-[#17150F]">
                {statusMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[#BDB5A2]">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-[#17150F] font-['IBM_Plex_Mono'] text-xs uppercase tracking-wider text-[#17150F] hover:bg-[#E9E3D3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSandboxLink}
                disabled={loading}
                className="px-5 py-2 bg-[#2F5D3A] text-[#F1EDE3] font-['IBM_Plex_Mono'] text-xs font-semibold uppercase tracking-wider hover:bg-[#17150F] transition-colors border border-[#17150F]"
              >
                {loading ? "Authenticating..." : "Authorize via Plaid Link →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

